

exports.hello = async (event) => {
  let startTime = Date.now();
  console.log(event);

  
  const traceId = event.queryStringParameters ? event.queryStringParameters.traceId : null;
  const currentTime = new Date().toISOString();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `traceId: ${traceId} , triggerStartTime: ${startTime}, runtime: javascript`,
      traceIdHttp: traceId,
      currentTime: currentTime,
    }),
  };
};

