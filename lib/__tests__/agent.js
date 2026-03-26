import { askAgent } from '../helpers/algolia.js';

describe('agent', () => {
  describe('documented examples (must always pass)', () => {
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
      [
        {
          question: 'Show me everything that happened on April 1st',
          expected: {
            filters: 'date.month:4 AND date.day:1',
          },
        },
      ],
      [
        {
          question: 'Show me frustrated issues',
          expected: {
            filters: 'type:issue AND sentiment.emotions:frustration',
          },
        },
      ],
      [
        {
          question: 'Show me only positive interactions of the year 2025',
          expected: {
            filters: 'sentiment.primary:positive AND date.year:2025',
          },
        },
      ],
      [
        {
          question: 'Show me the biggest refactorings',
          expected: {
            index: 'commitology_instantsearch_most_files_changed',
          },
        },
      ],
      [
        {
          question: 'Show me the biggest cleanups',
          expected: {
            index: 'commitology_instantsearch_most_lines_deleted',
          },
        },
      ],
      [
        {
          question: 'Show me the biggest performance refactorings',
          expected: {
            filters: 'commit.state:perf',
            index: 'commitology_instantsearch_most_files_changed',
          },
        },
      ],
      [
        {
          question: 'Show me all open issues about Next.js',
          expected: {
            query: 'Next.js',
            filters: 'type:issue AND issue.state:open',
          },
        },
      ],
      [
        {
          question: 'Find pull requests about Vue.js from 2024',
          expected: {
            query: 'Vue.js',
            filters: 'type:pull AND date.year:2024',
          },
        },
      ],
      [
        {
          question: 'Show me only bot comments',
          expected: {
            filters: 'type:comment AND user.isBot:true',
          },
        },
      ],
      [
        {
          question: 'Show me all performance open prs',
          expected: {
            query: 'perf',
            filters: 'type:pull AND pull.state:open',
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

  describe('generalization (should extrapolate from patterns)', () => {
    it.concurrent.each([
      [
        {
          question: 'Show me the last 5 commits by bobylito',
          expected: {
            filters: 'type:commit AND user.login:bobylito',
            hitsPerPage: 5,
          },
        },
      ],
      [
        {
          question: 'Find happy comments from 2025',
          expected: {
            filters:
              'type:comment AND sentiment.emotions:joy AND date.year:2025',
          },
        },
      ],
      [
        {
          question: 'Show me only negative comments',
          expected: {
            filters: 'type:comment AND sentiment.primary:negative',
          },
        },
      ],
      [
        {
          question: 'Show me commits from December 2024',
          expected: {
            filters: 'type:commit AND date.year:2024 AND date.month:12',
          },
        },
      ],
      [
        {
          question:
            'Show me the latest open issues where people are frustrated',
          expected: {
            filters:
              'type:issue AND issue.state:open AND sentiment.emotions:frustration',
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
