import { Context, Probot } from 'probot';

import { Chat } from './chat.js';
import { findLineForComment } from './parsingLines.js';
import assistants from './assisstants.js';

const OPENAI_API_KEY = 'OPENAI_API_KEY';
const MAX_PATCH_COUNT = process.env.MAX_PATCH_LENGTH
  ? +process.env.MAX_PATCH_LENGTH
  : Infinity;

function extractAndParseJsonArray(res: string): any[] | null {
  // Step 1: Identify JSON Start
  const startIndex = res.indexOf('[');
  // Step 2: Identify JSON End
  const endIndex = res.lastIndexOf(']');

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    console.error('Invalid JSON format');
    return null;
  }

  // Step 3: Extract JSON
  const jsonArrayStr = res.substring(startIndex, endIndex + 1);

  try {
    // Step 4: Parse JSON
    const jsonArray = JSON.parse(jsonArrayStr);
    return jsonArray;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

export const robot = (app: Probot) => {
  const loadChat = async (context: Context) => {
    if (process.env.OPENAI_API_KEY) {
      return new Chat(process.env.OPENAI_API_KEY);
    }

    const repo = context.repo();
    try {
      const { data } = (await context.octokit.request(
        'GET /repos/{owner}/{repo}/actions/variables/{name}',
        {
          owner: repo.owner,
          repo: repo.repo,
          name: OPENAI_API_KEY,
        }
      )) as any;

      if (!data?.value) {
        return null;
      }

      return new Chat(data.value);
    } catch (error) {
      console.log(error);
      await context.octokit.issues.createComment({
        repo: repo.repo,
        owner: repo.owner,
        issue_number: context.pullRequest().pull_number,
        body: `Seems an error occurred while initializing chatbot, please check the configuration.`,
      });
      return null;
    }
  };

  app.on(
    ['pull_request.opened', 'pull_request.synchronize'],
    async (context) => {
      const repo = context.repo();
      let assistantId = assistants[repo.repo] as string;
      if (!assistantId) return 'no assistant found';
      const chat = await loadChat(context);

      if (!chat) {
        console.log('Chat initialized failed');
        return 'no chat';
      }

      const pull_request = context.payload.pull_request;

      if (
        pull_request.state === 'closed' ||
        pull_request.locked
      ) {
        console.log('invalid event payload');
        return 'invalid event payload';
      }

      const target_label = process.env.TARGET_LABEL;
      if (
        target_label &&
        (!pull_request.labels?.length ||
          pull_request.labels.every((label) => label.name !== target_label))
      ) {
        console.log('no target label attached');
        return 'no target label attached';
      }

      const data = await context.octokit.repos.compareCommits({
        owner: repo.owner,
        repo: repo.repo,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
      });

      let { files: changedFiles, commits } = data.data;

      if (context.payload.action === 'synchronize' && commits.length >= 2) {
        const {
          data: { files },
        } = await context.octokit.repos.compareCommits({
          owner: repo.owner,
          repo: repo.repo,
          base: commits[commits.length - 2].sha,
          head: commits[commits.length - 1].sha,
        });

        const ignoreList = (process.env.IGNORE || process.env.ignore || '')
          .split('\n')
          .filter((v) => v !== '');

        const filesNames = files?.map((file) => file.filename) || [];
        changedFiles = changedFiles?.filter(
          (file) =>
            filesNames.includes(file.filename) &&
            !ignoreList.includes(file.filename)
        );
      }

      if (!changedFiles?.length) {
        console.log('no change found');
        return 'no change';
      }

      console.time('gpt cost');
      console.log('start reviewing ///////');
      for (let i = 0; i < changedFiles.length; i++) {
        const file = changedFiles[i];
        const patch = file.patch || '';

        if (file.status !== 'modified' && file.status !== 'added') {
          continue;
        }

        if (!patch || patch.length > MAX_PATCH_COUNT) {
          console.log(
            `${file.filename} skipped caused by its diff is too large`
          );
          continue;
        }
        try {
          if (file.filename.includes('questions')) {
            assistantId = assistants.theory;
          }
          const res = await chat?.codeReview(patch, assistantId);
          console.log('review result:', res);
          // res is a string which should be a json of an array of comments but may have text before or after
          //, i need to remove any text before or after the json array and then parse it


          if (!!res) {
            const resArr = extractAndParseJsonArray(res) || [];
            for (const res of resArr) {
              const lineForComment = findLineForComment(patch, res.line);
              await context.octokit.pulls.createReviewComment({
                repo: repo.repo,
                owner: repo.owner,
                pull_number: context.pullRequest().pull_number,
                commit_id: commits[commits.length - 1].sha,
                path: file.filename,
                body: res.content,
                line: lineForComment,
                side: 'RIGHT',
              });
            }
          }
        } catch (e) {
          console.error(`review ${file.filename} failed`, e);
        }
      }

      console.timeEnd('gpt cost');
      console.info(
        'successfully reviewed',
        context.payload.pull_request.html_url
      );

      return 'success';
    }
  );
};
