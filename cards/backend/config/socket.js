// this lets us do middleware stuff
module.exports = (socketIOServer) => {
  socketIOServer.use((socket, next) => {
    // I may use auth token?
    next();
  });

  // For debugging dang CORS cuz I wont want to deal with it again
  socketIOServer.engine.on("connection_error", (err) => {
    console.log(err.req);
    console.log(err.code);
    console.log(err.message);
    console.log(err.context);
  });

  return socketIOServer;
};