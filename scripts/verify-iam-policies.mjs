let input = "";
for await (const chunk of process.stdin) input += chunk;
const plan = JSON.parse(input);
const outputs = plan.planned_values?.outputs;
if (!outputs)
	throw new Error("Terraform plan did not include the IAM policy outputs.");
const trust = JSON.parse(outputs.gitlab_oidc_trust_policy.value);
const permissions = JSON.parse(outputs.deployment_permissions_policy.value);
const trustStatement = trust.Statement.find(
	(entry) => entry.Sid === "GitLabProtectedMainOnly",
);
if (!trustStatement) throw new Error("GitLab trust statement is missing.");
const conditions = trustStatement.Condition.StringEquals;
for (const [claim, expected] of Object.entries({
	"gitlab.com:aud": "sts.amazonaws.com",
	"gitlab.com:sub": "project_path:zwing99/for-the-day:ref_type:branch:ref:main",
	"gitlab.com:project_id": "87006951",
	"gitlab.com:namespace_id": "445508",
})) {
	if (conditions[claim] !== expected)
		throw new Error(`Unexpected GitLab OIDC trust value for ${claim}.`);
}
if (
	trustStatement.Principal.Federated !==
	"arn:aws:iam::716853106749:oidc-provider/gitlab.com"
)
	throw new Error(
		"The trust policy does not use the configured GitLab OIDC provider.",
	);

const statements = permissions.Statement;
const actions = new Set(
	statements.flatMap((entry) =>
		Array.isArray(entry.Action) ? entry.Action : [entry.Action],
	),
);
for (const action of [
	"iam:PassRole",
	"lambda:CreateFunction",
	"lambda:UpdateFunctionCode",
	"lambda:UpdateFunctionConfiguration",
	"dynamodb:CreateTable",
	"apigateway:POST",
	"s3:PutObject",
	"cloudfront:CreateInvalidation",
	"route53:CreateHostedZone",
	"acm:RequestCertificate",
]) {
	if (!actions.has(action))
		throw new Error(`Deployment permission ${action} is missing.`);
}
for (const action of actions) {
	if (
		/^(?:dynamodb:DeleteTable|s3:Delete|route53:DeleteHostedZone|lambda:DeleteFunction|cloudfront:Delete)/.test(
			action,
		)
	)
		throw new Error(
			`The deployment policy unexpectedly allows destructive action ${action}.`,
		);
}
const serialized = JSON.stringify(permissions);
for (const requiredResource of [
	"for-the-day-beta-lambda",
	"for-the-day-beta-api",
	"for-the-day-beta-chapters",
	"for-the-day-beta-static-716853106749",
]) {
	if (!serialized.includes(requiredResource))
		throw new Error(
			`Deployment policy is missing resource scope ${requiredResource}.`,
		);
}
console.log(
	"GitLab OIDC trust claims and scoped beta deployment permissions verified.",
);
