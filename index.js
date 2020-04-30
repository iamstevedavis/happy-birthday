const { handler } = require('./lambda');

handler({}, {}, (data) => {
  console.log(data);
});

// (async function() {
//   handler({}, {}, (data) => {
//     console.log(data);
//   });
// }());
