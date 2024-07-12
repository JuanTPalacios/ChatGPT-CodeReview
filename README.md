# Cody CodeReview

> A code review robot powered by ChatGPT

### Configuration

1. Go to the repo homepage which you want integrate this bot
2. click `settings`
3. click `actions` under `secrets and variables`
4. Change to `Variables` tab, create a new variable `OPENAI_API_KEY` with the value of your open api key (For Github Action integration, set it in secrets)
   <img width="1465" alt="image" src="https://user-images.githubusercontent.com/13167934/218533628-3974b70f-c423-44b0-b096-d1ec2ace85ea.png">
5. Add this main.yml file on the root directory following this root: .github/workflows/main.yml
   ```
   name: Cody Code Review

   permissions:
     contents: read
     pull-requests: write
   
   on:
     pull_request:
       types: [opened, reopened, synchronize]
   
   jobs:
     test:
       # if: ${{ contains(github.event.*.labels.*.name, 'gpt review') }} # Optional; to run only when a label is attached
       runs-on: ubuntu-latest
       steps:
         - uses: codeworks/Cody-CodeReview@main
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

### Start using

1. Cody will automatically do the code review when you create a new Pull request, the review information will show as inline comments in the pr timeline.
2. After `git push` update the pull request, cr bot will re-review the changed files
