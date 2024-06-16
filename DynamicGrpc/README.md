# Introduction

This project is going to demonstate using a MicroService to dynamically generate `gRPC` 
message types as `C#` source code, and then loading these in a dynamically linked assembly on
the `C#` side.

The basic idea is to take a simple proto message string like 
```proto
syntax = "proto3";

option csharp_namespace = "DynamicDataTypes";

message Point {
    int32 latitude = 1;
    int32 longitude = 2;
  }
```
consume it as a raw string in the Python service, compile it using the `protoc` compiler
which is installed on this container. Then send back the generated `C#` source code to
to the `C#` process which then dynamically links the library. That is on the Python
side we go
```
 protoString -[write to file]-> Datatype.proto -> [compile] -> Datatype.cs
```
then we send `Datatype.cs` back to the `C#` process and dynamically compile it with the
Roslyn api. (writing to file probably isn't necessary, probably a stream option for the protoc
compiler I just haven't looked yet)

Finally we create a utility method that initialise a point message with a latitude
and longitude using the `System.Linq.Expressions` api, this part has a 'hard-coded'
flavour. But we can easily see how we might relax that to be metadata driven.

## Assembly

TODO: More words about using the `Microsoft.CodeAnalysis.CSharp` API

## Post Assembly

Having created the `assembly` we can now do stuff with it

```C#
if (assembly.GetType("DynamicDataTypes.Point") is Type pointType)
{
    if (DynamicTypeHandler.CompilePointCreator(pointType) is Delegate pointCreator)
    {
        dynamic point = pointCreator.DynamicInvoke(new object[] { 4, 5 });
        Console.WriteLine(point.ToString());
    }
    else
    {
        // Do something 
    }
}
```
where the `DynamicTypeHandler` is a utility class which uses the `System.Linq.Expressions`
api to do more with the created type.