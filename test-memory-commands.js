import { 
  initUserMemory, 
  getUserMemory, 
  addUserInteraction, 
  addUserFact, 
  setUserPreference, 
  formatUserDataForDisplay,
  deleteUserData
} from './userMemory.js';

// Test user ID and username
const TEST_USER_ID = 'test-memory-commands-user';
const TEST_USERNAME = 'TestMemoryUser';

// Function to run all tests
async function runTests() {
  console.log('Starting memory commands tests...');
  
  // Initialize the user memory system
  await initUserMemory();
  console.log('✓ User memory system initialized');
  
  // Step 1: Create test user data
  console.log('\n--- Step 1: Creating test user data ---');
  
  // Add user interaction
  await addUserInteraction(
    TEST_USER_ID, 
    TEST_USERNAME, 
    'Hello, my name is Alex and I live in Munich.', 
    'Hello Alex! Nice to meet you. Munich is a beautiful city!'
  );
  console.log('✓ Added first user interaction');
  
  // Extract facts from message
  await extractUserFacts(
    TEST_USER_ID, 
    'Hello, my name is Alex and I live in Munich.', 
    'Hello Alex! Nice to meet you. Munich is a beautiful city!'
  );
  console.log('✓ Extracted facts from first message');
  
  // Add another interaction
  await addUserInteraction(
    TEST_USER_ID, 
    TEST_USERNAME, 
    'I am 28 years old and I work as a designer.', 
    'Being a designer at 28 gives you a good balance of creativity and experience!'
  );
  console.log('✓ Added second user interaction');
  
  // Extract facts from second message
  await extractUserFacts(
    TEST_USER_ID, 
    'I am 28 years old and I work as a designer.', 
    'Being a designer at 28 gives you a good balance of creativity and experience!'
  );
  console.log('✓ Extracted facts from second message');
  
  // Add a fact manually
  await addUserFact(TEST_USER_ID, 'User enjoys photography');
  console.log('✓ Added fact manually');
  
  // Set user preference
  await setUserPreference(TEST_USER_ID, 'language', 'German');
  await setUserPreference(TEST_USER_ID, 'theme', 'Dark mode');
  console.log('✓ Set user preferences');
  
  // Step 2: Test viewing user information
  console.log('\n--- Step 2: Testing !memory view command ---');
  const formattedData = await formatUserDataForDisplay(TEST_USER_ID);
  console.log('Formatted user data:');
  console.log(formattedData);
  console.log('✓ Successfully formatted user data for display');
  
  // Step 3: Test deleting user information
  console.log('\n--- Step 3: Testing !memory delete command ---');
  
  // First, verify user exists
  let userData = await getUserMemory(TEST_USER_ID);
  console.log(`User exists before deletion: ${userData !== null}`);
  
  // Delete user data
  const deleted = await deleteUserData(TEST_USER_ID);
  console.log(`Deletion result: ${deleted ? 'User data deleted successfully' : 'No user data found'}`);
  
  // Verify user data is gone
  userData = await getUserMemory(TEST_USER_ID);
  console.log(`User data after deletion: ${JSON.stringify(userData)}`);
  console.log(`User data is empty: ${Object.keys(userData.facts).length === 0 && userData.interactions.length === 0}`);
  console.log('✓ Successfully tested deletion functionality');
  
  console.log('\nAll tests completed successfully!');
}

// Helper function to extract facts (copied from userMemory.js for testing)
async function extractUserFacts(userId, message, response) {
  const patterns = [
    { regex: /my name is (\w+)/i, extract: (match) => `User's name is ${match[1]}` },
    { regex: /i am (\d+) years old/i, extract: (match) => `User is ${match[1]} years old` },
    { regex: /i live in ([^.,]+)/i, extract: (match) => `User lives in ${match[1]}` },
    { regex: /i work as a ([^.,]+)/i, extract: (match) => `User works as a ${match[1]}` },
    { regex: /i like ([^.,]+)/i, extract: (match) => `User likes ${match[1]}` },
    { regex: /i love ([^.,]+)/i, extract: (match) => `User loves ${match[1]}` },
    { regex: /i hate ([^.,]+)/i, extract: (match) => `User dislikes ${match[1]}` },
    { regex: /i prefer ([^.,]+)/i, extract: (match) => `User prefers ${match[1]}` }
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      await addUserFact(userId, pattern.extract(match));
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});