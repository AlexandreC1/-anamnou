import { expect, type APIRequestContext } from '@playwright/test';
export async function emailLink(
  request: APIRequestContext,
  email: string,
  route: string,
) {
  let link = '';
  await expect
    .poll(async () => {
      const list = (await (
        await request.get('http://127.0.0.1:8025/api/v1/search', {
          params: { query: 'to:' + email },
        })
      ).json()) as { messages: { ID: string }[] };
      for (const item of list.messages) {
        const message = (await (
          await request.get('http://127.0.0.1:8025/api/v1/message/' + item.ID)
        ).json()) as { Text: string };
        const match = new RegExp(
          'http://[^\\s]+/' + route + '#token=[a-f0-9]{64}',
        ).exec(message.Text);
        if (match) {
          link = match[0];
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  return link;
}
