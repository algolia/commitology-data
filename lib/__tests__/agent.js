import { askAgent } from '../helpers/algolia.js';

describe('agent', () => {
  describe('should answer correctly for', () => {
    it.concurrent.each([
      [
        {
          question: 'Give me the first commit by pixelastic',
          expected: {
            filters: 'type:commit AND user.login:pixelastic',
            index: 'commitology_instantsearch_oldest',
            hitsPerPage: 1,
          },
        },
      ],
      [
        {
          question: 'Show me the most discussed issues',
          expected: {
            filters: 'type:issue',
            index: 'commitology_instantsearch_most_commented',
          },
        },
      ],
      [
        {
          question: 'Give me only comments on issues',
          expected: {
            filters: 'type:comment AND parent.type:issue',
          },
        },
      ],
      // [
      //   {
      //     question: 'What is the first commit by pixelastic?',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit AND user.login:pixelastic',
      //       index: 'commitology_instantsearch_oldest',
      //       hitsPerPage: 1,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'Find the last commit by bobylito',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit AND user.login:bobylito',
      //       index: 'commitology_instantsearch',
      //       hitsPerPage: 1,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'Show me commits that modified the most files',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit',
      //       index: 'commitology_instantsearch_most_files_changed',
      //       hitsPerPage: 10,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'What is the most discussed issue?',
      //     expected: {
      //       query: '',
      //       filters: 'type:issue',
      //       index: 'commitology_instantsearch_most_commented',
      //       hitsPerPage: 1,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'Show me the commit with the most deletions',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit',
      //       index: 'commitology_instantsearch_most_lines_deleted',
      //       hitsPerPage: 1,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'Show me all closed issues about accessibility',
      //     expected: {
      //       query: 'accessibility',
      //       filters: 'type:issue AND issue.state:closed',
      //       index: 'commitology_instantsearch',
      //       hitsPerPage: 20,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question: 'Show me commits made on April 1st, 2025',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit AND date:1743465600 TO 1743551999',
      //       index: 'commitology_instantsearch',
      //       hitsPerPage: 10,
      //     },
      //   },
      // ],
      // [
      //   {
      //     question:
      //       'Show me commits during Christmas break from December 23, 2024 to January 2, 2025',
      //     expected: {
      //       query: '',
      //       filters: 'type:commit AND date>=1734912000 AND date<=1735776000',
      //       index: 'commitology_instantsearch',
      //       hitsPerPage: 10,
      //     },
      //   },
      // ],
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
