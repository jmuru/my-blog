---
layout: post
title: "Setting Up an AWS Lambda Triggered by API Gateway to Send Emails via SES"
categories: code aws
---

In this blog post, we’ll walk through setting up an AWS Lambda function triggered by API Gateway that uses Amazon Simple Email Service (SES) to send emails. We'll use Go to create the Lambda function, and our goal is to have the function fetch data from an external API and email the results. Let's dive in!

## Prerequisites

Before we start, make sure you have the following:
- An AWS account
- AWS CLI configured
- Go installed on your local machine
- Basic knowledge of AWS Lambda, API Gateway, and SES

## Step 1: Setting Up SES

First, you need to verify an email address with SES to use as the sender.

1. Go to the SES console.
2. In the left-hand navigation pane, choose **Verified Identities**.
3. Choose **Create Identity**.
4. Follow the prompts to verify an email address.

## Step 2: Writing the Lambda Function

Here's the Go code for the Lambda function:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "time"

    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/ses"
)

type EndpointList struct {
    Endpoints   []Endpoint `json:"endpoints"`
    URI         string     `json:"uri"`
    NextPageURI string     `json:"next_page_uri"`
}

type Endpoint struct {
    ID        string    `json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    PublicURL string    `json:"public_url"`
    Proto     string    `json:"proto"`
    HostPort  string    `json:"hostport"`
    Type      string    `json:"type"`
    Tunnel    Tunnel    `json:"tunnel"`
}

type Tunnel struct {
    ID  string `json:"id"`
    URI string `json:"uri"`
}

func handler(ctx context.Context) error {
    apiKey := os.Getenv("API_KEY")
    client := &http.Client{}

    req, err := http.NewRequest("GET", "https://api.ngrok.com/endpoints", nil)
    if err != nil {
        return err
    }
    req.Header.Set("Authorization", "Bearer "+apiKey)
    req.Header.Set("Ngrok-Version", "2")

    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    var endpointList EndpointList
    err = json.NewDecoder(resp.Body).Decode(&endpointList)
    if err != nil {
        return err
    }

    publicURLs := ""
    for _, endpoint := range endpointList.Endpoints {
        publicURLs += fmt.Sprintf("Public URL: %s\n", endpoint.PublicURL)
    }

    return sendEmail(publicURLs)
}

func sendEmail(publicURLs string) error {
    region := os.Getenv("REGION")
    sender := os.Getenv("SENDER")
    recipient := os.Getenv("RECIPIENT")
    if region == "" || sender == "" || recipient == "" {
        return fmt.Errorf("AWS_REGION, SENDER_EMAIL, or RECIPIENT_EMAIL environment variable is not set")
    }

    sess, err := session.NewSession(&aws.Config{
        Region: aws.String(region),
    })
    if err != nil {
        return fmt.Errorf("Error creating AWS session: %v", err)
    }

    svc := ses.New(sess)

    input := &ses.SendEmailInput{
        Destination: &ses.Destination{
            ToAddresses: []*string{
                aws.String(recipient),
            },
        },
        Message: &ses.Message{
            Body: &ses.Body{
                Text: &ses.Content{
                    Charset: aws.String("UTF-8"),
                    Data:    aws.String(publicURLs),
                },
            },
            Subject: &ses.Content{
                Charset: aws.String("UTF-8"),
                Data:    aws.String("Ngrok Public URLs"),
            },
        },
        Source: aws.String(sender),
    }

    _, err = svc.SendEmail(input)
    if err != nil {
        return fmt.Errorf("Error sending email: %v", err)
    }

    return nil
}

func main() {
    lambda.Start(handler)
}
```

This script does the following:
1. Fetches the list of endpoints from Ngrok.
2. Parses the JSON response to extract public URLs.
3. Sends an email with the public URLs using SES.

## Step 3: Setting Up Environment Variables

Ensure the following environment variables are set:
- `API_KEY`: Your Ngrok API key.
- `REGION`: Your AWS region (e.g., `us-west-2`).
- `SENDER`: The verified sender email address.
- `RECIPIENT`: The recipient email address.

## Step 4: Deploying the Lambda Function

1. **Create a deployment package:**
    ```sh
    GOOS=linux GOARCH=amd64 go build -o main main.go
    zip deployment.zip main
    ```

2. **Create a Lambda function:**
    ```sh
    aws lambda create-function --function-name SendNgrokEndpoints \
    --zip-file fileb://deployment.zip --handler main \
    --runtime go1.x --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE
    ```

3. **Set environment variables for the Lambda function:**
    ```sh
    aws lambda update-function-configuration --function-name SendNgrokEndpoints \
    --environment Variables="{API_KEY=your_api_key,REGION=your_region,SENDER=your_sender_email,RECIPIENT=your_recipient_email}"
    ```

## Step 5: Setting Up API Gateway

1. **Create an API:**
    - Go to the API Gateway console.
    - Choose **Create API** and follow the prompts.

2. **Create a resource and method:**
    - Create a new resource.
    - Add a **POST** method.
    - Integrate the method with your Lambda function.

3. **Deploy the API:**
    - Create a new stage and deploy your API.

## Step 6: Testing the Setup

You can test the setup by triggering the API endpoint through tools like Postman or CURL. If everything is configured correctly, you should receive an email with the Ngrok public URLs.

```sh
curl -X POST https://your-api-id.execute-api.your-region.amazonaws.com/your-stage/your-resource
```

## Conclusion

You've successfully set up an AWS Lambda function triggered by API Gateway to send emails using SES. This setup is powerful for automating notifications and alerts based on external data. Feel free to customize the function to suit your needs.

Happy coding!