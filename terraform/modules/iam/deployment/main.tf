data "aws_iam_policy_document" "gitlab_oidc_trust" {
  statement {
    sid     = "GitLabProtectedMainOnly"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${var.aws_account_id}:oidc-provider/gitlab.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "gitlab.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "gitlab.com:sub"
      values   = ["project_path:${var.gitlab_project_path}:ref_type:branch:ref:main"]
    }
    condition {
      test     = "StringEquals"
      variable = "gitlab.com:project_id"
      values   = [var.gitlab_project_id]
    }
    condition {
      test     = "StringEquals"
      variable = "gitlab.com:namespace_id"
      values   = [var.gitlab_namespace_id]
    }
  }
}

data "aws_iam_policy_document" "deployment_permissions" {
  statement {
    sid       = "CallerIdentity"
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  statement {
    sid    = "BetaLambdaRoleManagement"
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:GetRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:PutRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:PassRole",
    ]
    resources = ["arn:aws:iam::${var.aws_account_id}:role/for-the-day-beta-lambda"]
    condition {
      test     = "StringEqualsIfExists"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  statement {
    sid    = "BetaRuntime"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion",
      "lambda:ListVersionsByFunction",
      "lambda:CreateAlias",
      "lambda:GetAlias",
      "lambda:UpdateAlias",
      "lambda:AddPermission",
      "lambda:GetPolicy",
      "lambda:TagResource",
      "lambda:UntagResource",
    ]
    resources = ["arn:aws:lambda:${var.aws_region}:${var.aws_account_id}:function:for-the-day-beta-api*"]
  }

  statement {
    sid    = "BetaChapterTable"
    effect = "Allow"
    actions = [
      "dynamodb:CreateTable",
      "dynamodb:DescribeTable",
      "dynamodb:UpdateTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:UpdateTimeToLive",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:UpdateContinuousBackups",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:ListTagsOfResource",
    ]
    resources = ["arn:aws:dynamodb:${var.aws_region}:${var.aws_account_id}:table/for-the-day-beta-chapters"]
  }

  statement {
    sid    = "BetaApiGateway"
    effect = "Allow"
    actions = [
      "apigateway:GET",
      "apigateway:POST",
      "apigateway:PUT",
      "apigateway:PATCH",
      "apigateway:TagResource",
      "apigateway:UntagResource",
    ]
    resources = ["arn:aws:apigateway:${var.aws_region}::/apis/*"]
  }

  statement {
    sid    = "BetaStaticBucket"
    effect = "Allow"
    actions = [
      "s3:CreateBucket",
      "s3:GetBucketLocation",
      "s3:GetBucketPolicy",
      "s3:PutBucketPolicy",
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning",
      "s3:GetBucketPublicAccessBlock",
      "s3:PutBucketPublicAccessBlock",
      "s3:GetEncryptionConfiguration",
      "s3:PutEncryptionConfiguration",
      "s3:GetBucketTagging",
      "s3:PutBucketTagging",
      "s3:ListBucket",
      "s3:ListBucketVersions",
    ]
    resources = ["arn:aws:s3:::for-the-day-beta-static-${var.aws_account_id}"]
  }

  statement {
    sid       = "BetaStaticObjects"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["arn:aws:s3:::for-the-day-beta-static-${var.aws_account_id}/*"]
  }

  statement {
    sid    = "DnsCertificateAndZone"
    effect = "Allow"
    actions = [
      "acm:RequestCertificate",
      "acm:DescribeCertificate",
      "acm:ListTagsForCertificate",
      "acm:AddTagsToCertificate",
      "acm:RemoveTagsFromCertificate",
      "route53:CreateHostedZone",
      "route53:GetHostedZone",
      "route53:ListHostedZonesByName",
      "route53:ListResourceRecordSets",
      "route53:ChangeResourceRecordSets",
      "route53:GetChange",
      "route53:ListTagsForResource",
      "route53:ChangeTagsForResource",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "CloudFrontBetaDistribution"
    effect = "Allow"
    actions = [
      "cloudfront:CreateDistribution",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:UpdateDistribution",
      "cloudfront:ListTagsForResource",
      "cloudfront:TagResource",
      "cloudfront:UntagResource",
      "cloudfront:CreateFunction",
      "cloudfront:DescribeFunction",
      "cloudfront:PublishFunction",
      "cloudfront:UpdateFunction",
      "cloudfront:CreateCachePolicy",
      "cloudfront:GetCachePolicy",
      "cloudfront:CreateOriginRequestPolicy",
      "cloudfront:GetOriginRequestPolicy",
      "cloudfront:CreateOriginAccessControl",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations",
    ]
    resources = ["*"]
  }
}
