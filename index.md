---
layout: default
title: Home
permalink: /
---

# WinterWatch-Pro

Welcome to WinterWatch‑Pro — bookmark this to keep an eye on my project updates.

## Quick Links

- [Privacy](/privacy/)  

## About

This is a simple home page. Edit this file to change the text.

## Latest posts

<ul>
{% for post in site.posts %}
  <li><a href="{{ post.url }}">{{ post.title }}</a> — {{ post.date | date: "%Y-%m-%d" }}</li>
{% endfor %}
</ul>