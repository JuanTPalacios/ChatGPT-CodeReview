
import { OpenAI } from "openai";
export class Chat {
  private openAi: OpenAI;

  constructor(apiKey: string) {
    this.openAi = new OpenAI({ 
      apiKey,
      defaultHeaders: {"OpenAI-Beta": "assistants=v2"}
    });
  }

  private generatePrompt = (patch: string) => {
    const prompt =
      process.env.PROMPT ||
        'Below is a code patch, please help me do a brief code review on it. Any bug risks and/or improvement suggestions are welcome:';

    return `${prompt}:
    ${patch}
    `;
  };

  public codeReview = async (patch: string) => {
    if (!patch) {
      return '';
    }

    console.time('code-review cost');
    const prompt = this.generatePrompt(patch);
    try {
      const assistant = await this.openAi.beta.assistants.retrieve(
        "asst_Kbd0h4si27PFBnq3SGj7zZiZ"
      );

      const thread = await this.openAi.beta.threads.create();
      let run = await this.openAi.beta.threads.runs.createAndPoll(
        thread.id,
        { 
          assistant_id: assistant.id,
          additional_instructions: prompt,
          tool_choice: 'required'
        }
      );
      if (run.status === 'completed') {
        const GPTmessages = await this.openAi.beta.threads.messages.list(
          run.thread_id
        );
        console.timeEnd('code-review cost');
        // @ts-ignore: data is not defined in type definition
        return GPTmessages.data[0].content[0].text.value
      } else {
        console.log(run.status);
      }
      throw new Error('GPT-4o request failed');
    } catch (e) {
      console.error('GPT-4o request failed', e);
      return 'Error occurred during code review, please try again later.';
    }
  };
}
