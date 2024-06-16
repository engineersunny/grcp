using System.Reflection;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.CSharp;
using Google;
using Grpc.Net.Client;
using System.Linq.Expressions;


namespace DynamicGrpc
{
    class Program
    {

        static async Task<string> MainAsync()
        {
            using var channel = GrpcChannel.ForAddress("http://localhost:19123");
            var client = new MicroServices.GrpcCompiler.GrpcCompilerClient(channel);
            var reply = await client.CompileAsync(
                new MicroServices.CompileMessageRequest {} );
            return reply.SourceCode;
        }

        static void Main(string[] args)
        {
            var execAssembly = System.Reflection.Assembly.GetExecutingAssembly();
        
            var assemblyPath = Path.GetDirectoryName(typeof(object).Assembly.Location);
            List<MetadataReference> references = new List<MetadataReference>();
            references.Add(MetadataReference.CreateFromFile(typeof(object).GetTypeInfo().Assembly.Location));
            references.Add(MetadataReference.CreateFromFile(Path.Combine(assemblyPath, "netstandard.dll")));
            references.Add(MetadataReference.CreateFromFile(Path.Combine(assemblyPath, "System.Runtime.dll")));
            references.Add(MetadataReference.CreateFromFile(Path.Combine(assemblyPath, "System.Private.CoreLib.dll")));
            references.Add(MetadataReference.CreateFromFile(typeof(Google.Protobuf.IMessage).GetTypeInfo().Assembly.Location));

            var source = MainAsync().GetAwaiter().GetResult();
            Console.WriteLine(source);
            var tree = SyntaxFactory.ParseSyntaxTree(source.Trim());
            var compilation = CSharpCompilation
                .Create("DynamicDataType.cs")
                .WithOptions(new CSharpCompilationOptions(
                    OutputKind.DynamicallyLinkedLibrary,
                    optimizationLevel: OptimizationLevel.Release ))
                .WithReferences(references)
                .AddSyntaxTrees(tree);

            string errorMessage = null;
            Assembly assembly = null;

            using(var codeStream = new MemoryStream())
            {
                // Actually compile the code
                EmitResult compilationResult = null;
                compilationResult = compilation.Emit(codeStream);
                
                // Compilation Error handling
                if(!compilationResult.Success)
                {
                    var sb = new System.Text.StringBuilder();
                    foreach(var diag in compilationResult.Diagnostics)
                    {
                        sb.AppendLine(diag.ToString());
                    }
                    errorMessage = sb.ToString();
                    Console.WriteLine(errorMessage);
                    return;
                }
            // Load
            assembly = System.Reflection.Assembly.Load(((MemoryStream) codeStream).ToArray());
            }

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
        
        }
    }
}