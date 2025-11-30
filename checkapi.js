const axios = require('axios');


const apiKey = 'a79c0f0f-3f74-5ac4-335d-78f76511';
const apiUrl = `https://api.goapi.io/regional/provinsi?api_key=${apiKey}`;


axios.get(apiUrl)
  .then(response => {
    // Handle response data here
    console.log(response.data);
  })
  .catch(error => {
    // Handle errors here
    console.error('Error:', error);
});