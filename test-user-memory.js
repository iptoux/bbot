import { 
  initUserMemory, 
  getUserMemory, 
  addUserInteraction, 
  addUserFact, 
  setUserPreference, 
  generateUserContext, 
  extractUserFacts 
} from './userMemory.js';

// Test user ID and username
const TEST_USER_ID = 'test-user-123';
const TEST_USERNAME = 'TestUser';

// Function to run all tests
async function runTests() {
  console.log('Starting user memory system tests...');
  
  // Initialize the user memory system
  await initUserMemory();
  console.log('✓ User memory system initialized');
  
  // Test 1: Create a new user
  let userData = await getUserMemory(TEST_USER_ID);
  console.log('✓ Created new user entry:', userData);
  
  // Test 2: Add user interaction
  await addUserInteraction(
    TEST_USER_ID, 
    TEST_USERNAME, 
    'Hello, my name is John and I live in Berlin.', 
    'Hello John! Nice to meet you. How is the weather in Berlin?'
  );
  console.log('✓ Added user interaction');
  
  // Test 3: Extract facts from message
  await extractUserFacts(
    TEST_USER_ID, 
    'Hello, my name is John and I live in Berlin.', 
    'Hello John! Nice to meet you. How is the weather in Berlin?'
  );
  console.log('✓ Extracted facts from message');
  
  // Test 4: Add a fact manually
  await addUserFact(TEST_USER_ID, 'User likes programming');
  console.log('✓ Added fact manually');
  
  // Test 5: Set user preference
  await setUserPreference(TEST_USER_ID, 'language', 'German');
  console.log('✓ Set user preference');
  
  // Test 6: Add another interaction
  await addUserInteraction(
    TEST_USER_ID, 
    TEST_USERNAME, 
    'I am 30 years old and I work as a developer.', 
    'That\'s great! Being a developer at 30 means you have a good balance of experience and energy.'
  );
  console.log('✓ Added second user interaction');
  
  // Test 7: Extract facts from second message
  await extractUserFacts(
    TEST_USER_ID, 
    'I am 30 years old and I work as a developer.', 
    'That\'s great! Being a developer at 30 means you have a good balance of experience and energy.'
  );
  console.log('✓ Extracted facts from second message');
  
  // Test 8: Generate user context
  const context = await generateUserContext(TEST_USER_ID);
  console.log('✓ Generated user context:');
  console.log(context);
  
  // Test 9: Verify user data
  userData = await getUserMemory(TEST_USER_ID);
  console.log('✓ Final user data:');
  console.log(JSON.stringify(userData, null, 2));
  
  console.log('\nAll tests completed successfully!');
  console.log('The user-memory.json file should now contain the test user data.');
  console.log('You can check the file to verify that the data was saved correctly.');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});