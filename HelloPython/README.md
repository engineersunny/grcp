# Introduction

**TODO** More intro, more words

Useful links
* https://docs.microsoft.com/en-us/dotnet/core/install/linux-ubuntu#2004
* https://grpc.io/docs/languages/python/
* https://docs.microsoft.com/en-us/aspnet/core/grpc/?view=aspnetcore-6.0

## Simple CS Project

We should all have the dotnet sdk installed on our WSL systems, but lets double check this
by doing a quick
```bash
dotnet --version
```

now lets make a simple console application
```
dotnet new console --framework net6.0
```
now I don't love the new default templates, so replace the contents of `Program.cs`
with
```cs
namespace HelloPython
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }
}
```
we can double check everything is working as intended by doing a simple
```bash
dotnet run
```
and we should get back a nice `Hello, World` statement in our terminal.

## gRPC

To be faithful to the structure of our projects we are going to make 
the service in a folder like `./MicroServices/Greeter/`
```bash
mkdir MicroServices && mkdir MicroServices/Greeter && touch MicroServices/Greeter/service.proto
```
Our `service.proto` file is going to be very simple, while at the same time controlling where
most of the magic happens.
```proto
syntax = "proto3";

option csharp_namespace = "MicroServices";

message SayHelloRequest {}

message SayHelloResponse {
    string Message = 1;
}

service Greeter {
    rpc SayHello(SayHelloRequest) returns (SayHelloResponse) {}
}
```
Now these are lightweight structs that define the basic message types that
services and clients will send and reciever, and we can compile these and have
a look. Move into the `MicroServices/Greeter` directory and run the following
```bash
pip3 install grpcio-tools
```
to install the grpc/protobuff compiled. Then
```bash
python3 -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. service.proto
```
this will have created two new files. `service_pb2.py` and `service_pb2_grpc.py`, these
file names come from the `service.proto` name (we could if we wished change them).

Now we need to implement some of the logic on the python side that can actually 
implement the program sketched out by the `*.proto` stubs. 
```python
from concurrent import futures
import grpc
import time
import sys

import service_pb2
import service_pb2_grpc

class EService(service_pb2_grpc.GreeterServicer):

    def SayHello(self, request, context):
        return service_pb2.SayHelloResponse(Message="Hello, World!")

def serve():
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
  service_pb2_grpc.add_GreeterServicer_to_server(EService(),server)
  server.add_insecure_port('[::]:36000')
  server.start()
  print("Server started. Awaiting jobs...")
  server.wait_for_termination()

if __name__ == '__main__':
  serve()
```

## Containerisation
Now we are going to wrap up what we have just done inside a container.

```dockerfile
FROM python:3.7 as build

RUN apt-get update
WORKDIR /app

RUN pip3 install grpcio-tools && mkdir -p /app/service_compiled
COPY service.proto .
RUN python3 -m grpc_tools.protoc -I. --python_out=/app/service_compiled --grpc_python_out=/app/service_compiled service.proto

FROM python:3.7 as runtime

RUN useradd --no-log-init --uid $(shuf -i 2000-65000 -n 1) --create-home app && mkdir /app && chown app:app /app
COPY --chown=app:app ./requirements.txt requirements.txt

USER app
WORKDIR /app

COPY --chown=app:app ./requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY --from=build --chown=app:app /app .
COPY --chown=app:app server.py .

CMD ["python", "/app/server.py"]
```

and lets a simple podman-compose config file to build this container. So move back up
to the root of the project.
```yaml
version: '3.8'

services:
  pyserver:
    image: hellopython/greeter
    build: ./MicroServices/Greeter
    command: ["sh", "-c", "pip install debugpy -t /tmp && python /tmp/debugpy --listen 0.0.0.0:36001 server.py runserver 0.0.0.0:36000 --nothreading --noreload"]
    ports:
      - 36000:36000
      - 36001:36001
```
and lets now check everything is working as expected
```bash
podman-compose -f docker-compose.debug.yml up -d --build  && sleep 1
```
**remember to uncomment `sys.path.append("/app/service_compiled")` (or add) into `server.py` if playing along at home!**
Now if we do `podman ps` we should see our container happily sitting there
```
176bb315101d  localhost/hellopython/greeter:latest                   sh -c pip install...  10 seconds ago  Up 11 seconds ago  0.0.0.0:36000-36001->36000-36001/tcp                introtogrpc_pyserver_1
```
(and make sure your ports match if you changed them).

**TODO** Add more podman commands and explanations.

## Back to CS
Now our container is happy and running, we want to call it from C#, but again everything
is simply generated from the `.proto` file. First go into the `HelloPython.csproj` file and
```xml
<ItemGroup>
    <PackageReference Include="Google.Protobuf" Version="3.21.4" />
    <PackageReference Include="Grpc.Net.Client" Version="2.47.0" />
    <PackageReference Include="Grpc.Tools" Version="2.47.0" />
</ItemGroup>
```
then add the following to tell the compiler where to find the `.proto` file and that we only want to generate
code to make a client.
```xml
  <ItemGroup>
    <Protobuf Include="MicroServices\Greeter\service.proto" GrpcServices="Client" />
  </ItemGroup>
```
Now ask for vscode to generate the assets to build and debut. `ctrl + shift + P`
to open the command palette and start typing `> generate asserts` and you should
see `.NET: Generate Assets for Build and Debug`, select that and it should make for
you a `launch.json` and `tasks.json` file inside of a `.vscode` folder, find out
a little bit more about [tasks in vscode here](https://code.visualstudio.com/docs/editor/tasks). Then hit
`f5` and the project should build, and print `Hello, World` in the terminal. But this is just
the default project. We want to get this message from python!
```cs
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
```
make sure all of your ports match up.