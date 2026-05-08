const https = require('https');
https.get('https://openrouter.ai/api/v1/models', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const m = json.data.find(x => x.id.includes('free'));
    console.log(m ? m.pricing : 'not found');
  });
});
