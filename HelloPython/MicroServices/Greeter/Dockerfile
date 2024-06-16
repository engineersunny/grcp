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