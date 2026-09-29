resource "aws_lambda_function" "api" {
  function_name    = "for-the-day-beta-api"
  role             = var.lambda_role_arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  architectures    = ["arm64"]
  memory_size      = 512
  timeout          = 30
  publish          = true

  environment {
    variables = {
      AWS_REGION       = var.aws_region
      DYNAMODB_TABLE   = var.table_name
      API_BIBLE_KEY    = var.api_bible_key
      API_BIBLE_CSB_ID = var.api_bible_csb_id
      API_BIBLE_NIV_ID = var.api_bible_niv_id
      API_BIBLE_NLT_ID = var.api_bible_nlt_id
      CROSSWAY_KEY     = var.crossway_key
    }
  }

  lifecycle {
    precondition {
      condition = length(jsonencode({
        API_BIBLE_KEY    = var.api_bible_key
        API_BIBLE_CSB_ID = var.api_bible_csb_id
        API_BIBLE_NIV_ID = var.api_bible_niv_id
        API_BIBLE_NLT_ID = var.api_bible_nlt_id
        CROSSWAY_KEY     = var.crossway_key
        AWS_REGION       = var.aws_region
        DYNAMODB_TABLE   = var.table_name
      })) <= 4096
      error_message = "The complete Lambda environment must stay within AWS Lambda's 4 KB limit."
    }
  }
}

resource "aws_lambda_alias" "beta" {
  name             = "beta"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

resource "aws_apigatewayv2_api" "api" {
  name          = "for-the-day-beta-api"
  protocol_type = "HTTP"
}

resource "aws_lambda_permission" "api_gateway" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.beta.name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_alias.beta.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 15
    throttling_rate_limit  = 5
  }
}
