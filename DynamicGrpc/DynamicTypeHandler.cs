using System.Linq.Expressions;
using System.Reflection;

namespace DynamicGrpc;

class DynamicTypeHandler
{
	public static Delegate CompilePointCreator(Type pointType)
	{
		if (pointType.GetConstructor(System.Type.EmptyTypes) is ConstructorInfo ctorInfo)
		{
			var latitudeMemberInfo = pointType.GetMember("latitude", BindingFlags.Public | BindingFlags.IgnoreCase | BindingFlags.Instance )[0];
			var longitudeMemberInfo = pointType.GetMember("longitude", BindingFlags.Public | BindingFlags.IgnoreCase | BindingFlags.Instance )[0];

			var newPointExpr = Expression.New(ctorInfo);

			var latitudeParam = Expression.Parameter(typeof(int), "latitude");
			var longitudeParam = Expression.Parameter(typeof(int), "longitude");

			var latitudeMemberBinding = Expression.Bind(latitudeMemberInfo, latitudeParam);
			var longitudeMemberBinding = Expression.Bind(longitudeMemberInfo, longitudeParam);

			var memberInitExpr = Expression.MemberInit(newPointExpr, latitudeMemberBinding, longitudeMemberBinding);

			var lambdaExpr = Expression.Lambda(memberInitExpr, new ParameterExpression[] { latitudeParam, longitudeParam });
			var pointCreator = lambdaExpr.Compile();

			return pointCreator;
		}
		else
		{
			return null;
		}
	}
}  