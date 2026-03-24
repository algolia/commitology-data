import { askAgent } from '../helpers/algolia.js';

describe('agent', () => {
  describe('should answer correctly for', () => {
    it.concurrent.each([
      [
        {
          question: 'Give me the first commit by pixelastic',
          expected: {
            query: '',
            filters: 'type:commit AND user.login:pixelastic',
            index: 'commitology_instantsearch_oldest',
            hitsPerPage: 1,
          },
        },
      ],
      [
        {
          question: 'What is the first commit by pixelastic?',
          expected: {
            query: '',
            filters: 'type:commit AND user.login:pixelastic',
            index: 'commitology_instantsearch_oldest',
            hitsPerPage: 1,
          },
        },
      ],
    ])(
      '$question',
      async ({ question, expected }) => {
        const { json } = await askAgent(question);
        expect(json).toEqual(expected);
      },
      10000,
    );
  });
});
