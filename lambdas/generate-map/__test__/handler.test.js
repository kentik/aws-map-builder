const { handler } = require('../src/index')

describe('Lambda handler', () => {
  it('default execution', async () => {
    const context = { invokedFunctionArn: 'arn:aws:lambda:us-east-1:012345678912:function:GenerateMapFunction' };
    const event = {}
    let result;
    try {
      result = await handler(event, context);
    } catch (error) {
      fail('handler caused an error', error);
    }
    console.log(result);
  })
})
