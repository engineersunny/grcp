from concurrent import futures
import grpc
import time
import sys

sys.path.append("/app/service_compiled")
import service_pb2
import service_pb2_grpc

import os
import tempfile
import subprocess

example_msg = """
syntax = "proto3";

option csharp_namespace = "DynamicDataTypes";

message Point {
    int32 latitude = 1;
    int32 longitude = 2;
  }
"""

class EService(service_pb2_grpc.GrpcCompilerServicer):

  def Compile(self, request, context):

    src = ""
    with tempfile.TemporaryDirectory() as tempdir:

      with open(os.path.join(tempdir, 'datatype.proto'), 'w') as fp:
        fp.write(example_msg)

      gen_code_dir = os.path.join(tempdir, 'gen')

      os.mkdir(gen_code_dir)

      cmd = [
        '/usr/bin/protoc',
        '--proto_path', tempdir,
        '--csharp_out', gen_code_dir,
        'datatype.proto'
      ]
      p = subprocess.Popen(cmd)

      (output, err) = p.communicate()  

      #This makes the wait possible
      p_status = p.wait()

      items = os.listdir(gen_code_dir)
      with open(os.path.join(gen_code_dir, 'Datatype.cs'), 'r') as fp:
        src = fp.read()

    return service_pb2.CompileMessageResponse(SourceCode=src)

def serve():
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
  service_pb2_grpc.add_GrpcCompilerServicer_to_server(EService(),server)
  server.add_insecure_port('[::]:19123')
  server.start()
  print("Server started. Awaiting jobs...")
  server.wait_for_termination()

if __name__ == '__main__':
  serve()