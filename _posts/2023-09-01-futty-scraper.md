---
layout: post
title: "Football Fixture Scraper Concept"
categories: webscraping golang html web football soccer sports
tags: webdev scraping data sports
---
In today's data-driven world, information is often scattered across the web. Sometimes, we need to gather data from websites for various purposes, such as research, analysis, or automation. Go, a powerful programming language, provides us with the tools to perform web scraping and data extraction efficiently.

In this blog post, we'll explore a Go program that demonstrates web scraping and data extraction. This program is designed to extract fixture information for a sports league from a website. Specifically, we aim to find the date of the matches and the teams that are playing. Let's dive into the code to understand how it accomplishes this task.

## The Code

```go
package main

import (
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"golang.org/x/net/html"
	"log"
	"net/http"
	"os"
)

type fixtureResult struct {
	teams     []string
	matchDate []string
}

func main() {
	// Open and parse the HTML file
	file, err := os.Open("./2023-ligue1-fixtures.html")
	if err != nil {
		log.Fatalf("Error opening HTML file: %v", err)
	}
	defer file.Close()

	doc, err := html.Parse(file)
	if err != nil {
		log.Fatalf("Error parsing HTML: %v", err)
	}

	// Find and print contents of li.MatchCardsList_matchCard__DBsrE
	findAndPrintMatchCardContents(doc)
}

func findAndPrintMatchCardContents(node *html.Node) {
	if node.Type == html.ElementNode && node.Data == "li" {
		for _, attr := range node.Attr {
			if attr.Key == "class" && attr.Val == "MatchCardsList_matchCard__DBsrE" {
				anchor := node.FirstChild
				for _, attr := range anchor.Attr {
					if attr.Key == "href" {
						// Extract fixture information
						getFixtureInfo(attr.Val)
					}
				}
			}
		}
	}

	// Recursively process child nodes
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		findAndPrintMatchCardContents(child)
	}
}

func getFixtureInfo(fixturePath string) {
	// Build the full URL
	link := fmt.Sprintf(`https://onefootball.com/%s`, fixturePath)
	resp, err := http.Get(link)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	// Create a goquery document from the response body
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	var date []string
	var teams []string

	// Find and extract the match date
	doc.Find(".MatchScore_numeric__ke8YT").Each(func(i int, s *goquery.Selection) {
		date = append(date, s.Text())
	})

	// Find and extract the team names
	doc.Find(".MatchScoreTeam_name__zzQrD").Each(func(i int, s *goquery.Selection) {
		teams = append(teams, s.Text())
	})

	// Create a fixtureResult struct to store the extracted data
	fixture := fixtureResult{
		teams:     teams,
		matchDate: date,
	}

	// Print the extracted fixture information
	fmt.Printf("%+v\n", fixture)
}
```

## How It Works

Now, let's break down how this Go program accomplishes its goal:

1. **Opening and Parsing HTML**: The program starts by opening an HTML file named `2023-xxxx-fixtures.html`. It uses the `os` and `golang.org/x/net/html` packages to do this. The HTML content is loaded into a structured format for parsing.

2. **Searching for Match Cards**: The `findAndPrintMatchCardContents` function is responsible for searching for specific HTML elements (`li`) with the class name `MatchCardsList_matchCard__DBsrE`. When a matching element is found, the program extracts the `href` attribute from the anchor element within that `li`. This `href` attribute contains a path to another web page with detailed fixture information.

3. **Fetching Detailed Fixture Information**: The `getFixtureInfo` function constructs the full URL for the detailed fixture information, sends an HTTP GET request to that URL, and creates a `goquery` document from the response body. Using `goquery` simplifies HTML parsing and querying.

4. **Extracting Data**: The program searches for HTML elements with class names `MatchScore_numeric__ke8YT` (which contains match dates) and `MatchScoreTeam_name__zzQrD` (which contains team names). It extracts this data and stores it in slices.

5. **Printing Results**: Finally, the program creates a `fixtureResult` struct to store the extracted data and prints it in a structured format.

## Ways to improve

A very powerful concept that is commonly used in golang is concurrency, currently my code retrieves data serially which can be slow depending on the volume of data. One way I can expand on this script is to retrieve fixture data using a group of workers dispatched in paralell 

## Conclusion

This Go program showcases how to perform web scraping and data extraction efficiently. By leveraging Go's powerful packages like `github.com/PuerkitoBio/goquery`, we can parse HTML, navigate complex structures, and extract valuable information from websites. Web scraping is a versatile technique with applications in various domains, from data analysis to automation. I might end up using this data to create an iOS app or something who
knows?!?!?!?! See ya next time!