const { handler } = require('./lambda/happyBirthday');

handler({}, {}, (data) => {
  console.log(data);
});

// (async function() {
//   handler({}, {}, (data) => {
//     console.log(data);
//   });
// }());
