using Grpc.Net.Client;

namespace HelloPython
{
    class Program
    {

        static async Task<string> MainAsync()
        {
            using var channel = GrpcChannel.ForAddress("http://localhost:36000");
            var client = new MicroServices.Greeter.GreeterClient(channel);
            var reply = await client.SayHelloAsync(
                            new MicroServices.SayHelloRequest {} );
            return reply.Message;
        }
        static void Main(string[] args)
        {
            var msg = MainAsync().GetAwaiter().GetResult();
            Console.WriteLine(msg);
        }
    }
}