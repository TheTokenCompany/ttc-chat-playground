This repo should contain a nextjs project for example RP app that demonstrates the token company input compression. Docs for it here thetokencompany.com/docs

The name of the project is The Token Company Chat Sandbox

It should integrate OpenRouter for LLM.

The app should be super simple. There is a chatbot AI that the user can talk to and it measures the tokens spent on the conversation and the money spent.

Before user starts a new conversation, they choose the LLM model (offer chinese models like deepseek and Mistral and some small gemini models). They can also choose the edit the system prompt if they wish but there is a default. When user goes to the chat, they have settings constantly visible on the right side of the screen where they can change the compression turn frequency (from 5 to 15) and compression aggressiveness (from 0.1 to 0.9). It also constantly displays the tokens used and tokens compressed.

This is how the chat compression should work: There should be always in the list on inputs the system prompt first [{system, msg}, {agent, msg}, {user, msg} ... ] and it should append new messages to the end until we reach the compression turn frequency amount of messages. When this happens, we should take all messages apart from the first system prompt, concatenate them together in newlines with turn labels and compress with the compression aggresiveness. This compressed prompt is then added as an additional system prompt below the previous one. [{system, msg}, {system, compressed_history}, ...]. When compressing next time, it should again take the compressed history and concatenate the new messages as newlines below that and then compress the whole thing again (the compressed history gets even more compressed now which is fine). 

For the new agent or user messages added to the input to be compressed, add <ttc_safe> tokens to their turn labels so the turn labels are kept. Dont do this for the compressed_history. Read more on how to use them at https://thetokencompany.com/docs/protect-text

For frontend, of course show the actual messages not compressed ones. Also enable toggle in the settigns to show the actual chat history messages (the compressed second system prompt and others to see under the hood).

You should display constantly the used input tokens, cached input tokens, cost and total compressed tokens and saved on compression for the user in the settings sidepanel. You should probably get this from the openrouter endpoint for the model costs used. Saved tokens is shown on the compression endpoint response. Take into consideration now cache invalidations that are done because of the compression step.

UI should be very plain and simple, dark mode. We dont care about UI just the functionality. Use nextjs server actions for backend stuff and keep the project simple.

Also add a page that explains how the compression is done with visualizations for the user.

Also allow user to let AI generate a message response to the last message if they want to try the sandbox but dont want to write million different messages. Take only the last agent response as input. Dont count this helper button generation as total tokens used quota is this is separate and should not be displayed in the statistics on the settings panel.