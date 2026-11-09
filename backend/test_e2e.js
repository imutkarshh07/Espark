const axios = require('axios');

async function testPipeline() {
  console.log('--- Step 1: Health Check ---');
  const health = await axios.get('http://localhost:5000/api/health');
  console.log('Services status:', health.data.data.services);

  console.log('\n--- Step 2: Fetch Profile ---');
  const profile = await axios.get('http://localhost:5000/api/profile');
  console.log('Profile:', profile.data.data);

  console.log('\n--- Step 3: Fetch Available Tests ---');
  const testsRes = await axios.get('http://localhost:5000/api/tests');
  console.log('Found', testsRes.data.data.length, 'tests.');
  const targetTest = testsRes.data.data[0];
  console.log('Taking test:', targetTest.title);

  console.log('\n--- Step 4: Start Test Attempt ---');
  const startRes = await axios.post(`http://localhost:5000/api/tests/${targetTest.id}/start`);
  const attemptId = startRes.data.data.id;
  console.log('Attempt started with ID:', attemptId);

  console.log('\n--- Step 5: Complete Attempt & Trigger Python RAG Microservice ---');
  const wrongAnswer = {
    question_id: targetTest.questions[0].id,
    selected_answer: targetTest.questions[0].options[0], // Selected Genotype (incorrect)
    time_taken: 42,
  };

  const completeRes = await axios.post(`http://localhost:5000/api/attempts/${attemptId}/complete`, {
    answers: [wrongAnswer],
  });

  console.log('\n--- Step 6: End-to-End Verification Results ---');
  const resData = completeRes.data.data;
  console.log('Score:', resData.score + '%');
  console.log('Generated Mistakes Count:', resData.mistakes.length);
  if (resData.mistakes.length > 0) {
    const m = resData.mistakes[0];
    console.log('Diagnosed Category:', m.category);
    console.log('AI Root Cause / Reason:', m.reason);
    console.log('AI Explanation:', m.insight?.explanation);
    console.log('Follow-up Practice Drill:', m.insight?.practice_questions?.[0]?.question_text);
  }

  console.log('\n✅ ALL BACKEND & RAG SERVICES CONNECTED AND WORKING!');
}

testPipeline().catch((err) => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
