import { getSentiment } from '../lib/helpers/claude.js';

/**
 * Test script to verify Claude API integration
 */
async function testSentiment() {
  console.log('🧪 Testing Claude sentiment analysis...\n');

  // Test cases
  const testCases = [
    {
      title: 'setIndex should not set page to 0',
      body: 'I understand why it was there in the first place but the snippet will not load page 2. And I think it is not what we want.',
      expected: 'negative (frustration/confusion)',
    },
    {
      title: 'Amazing new feature!',
      body: 'This is perfect! Thank you so much for implementing this. Love the new API.',
      expected: 'positive (joy/gratitude)',
    },
    {
      title: 'Update documentation for React hooks',
      body: 'This PR updates the documentation to include examples using React hooks.',
      expected: 'neutral',
    },
  ];

  for (const [index, testCase] of testCases.entries()) {
    console.log(`Test ${index + 1}/${testCases.length}: ${testCase.title}`);
    console.log(`Expected: ${testCase.expected}`);

    try {
      const result = await getSentiment({
        title: testCase.title,
        body: testCase.body,
      });
      console.log(
        `Result:   ${result.primary}`,
        result.emotions.length > 0 ? `(${result.emotions.join(', ')})` : '',
      );
      console.log(`Score:    ${(result.score * 100).toFixed(0)}% confidence`);
      console.log('✅ Success\n');
    } catch (error) {
      console.error('❌ Error:', error.message, '\n');
    }
  }

  console.log('🎉 Test complete!');
}

// Run test
testSentiment().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
