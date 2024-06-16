from concurrent import futures
import grpc
import time
import sys

# We will uncomment the below when it is time to containerise
sys.path.append("/app/service_compiled")
import service_pb2
import service_pb2_grpc

class EService(service_pb2_grpc.GreeterServicer):

    def SayHello(self, request, context):
        return service_pb2.SayHelloResponse(Message="Hello from Python!")

def serve():
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
  service_pb2_grpc.add_GreeterServicer_to_server(EService(),server)
  server.add_insecure_port('[::]:36000')
  server.start()
  print("Server started. Awaiting jobs...")
  server.wait_for_termination()

if __name__ == '__main__':
  serve()