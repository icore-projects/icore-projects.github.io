# i.Core Projects

> Identity Core Management Platform  
> A lightweight, role-based access control (RBAC) system inspired by modern cloud IAM platforms.

---

## Live Site 
https://icore-projects.github.io

---

## Overview

**i.Core** is a cloud-style Identity and Access Management (IAM) concept project built to demonstrate:

- Authentication flow
- Session-based security
- Role-Based Access Control (RBAC)
- Permission-driven authorization
- Secure servlet filter architecture

It is designed like a simplified version of enterprise IAM systems such as AWS IAM or Azure Active Directory.

---

## Core Features

- User Registration & Login system
- Session-based authentication
- CSRF token support (planned / optional)
- Role-Based Access Control (RBAC)
- Permission-based authorization engine
- Dynamic access control via servlet filters
- Role management system
- User management system
- Secure access denial (403 handling)

---

## System Architecture

Browser
↓
JSP Pages
↓
Servlet Controller
↓
Authentication Filter
↓
Permission Engine
↓
Role → Permission Resolver (Database)
↓
Access Decision (ALLOW / DENY)
↓
MySQL Database

---

## UI Concept

This project follows a **Cloud Console Design Approach**:

- Sidebar-based navigation
- Admin dashboard layout
- Card-based UI sections
- Role-aware menu rendering
- Clean and minimal cloud interface style

---

## Screenshots / UI Preview

assets/images/
├── dashboard.png
├── users.png
├── roles.png
└── login.png

---
## Project Structure

icore-projects.github.io
│
├── index.html
├── dashboard.html
├── docs.html
├── architecture.html
│
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
│
└── README.md

---

## Technology Stack

- HTML5
- CSS3
- JavaScript
- GitHub Pages (Hosting)
- UI inspired by Cloud IAM systems

---

## Core Principle

> "Identity is verified once.  
> Permissions decide what you can do.  
> Access is enforced dynamically at runtime."

---

## Future Enhancements

- Audit logging dashboard
- Multi-tenant support
- REST API backend integration
- Docker-based deployment
- Admin analytics dashboard
- SSO / OAuth integration

---

## Author

**Tharvesh Muhaideen A**  
Developer of i.Core Identity Platform

- GitHub: https://github.com/icore-projects
- Project: https://icore-projects.github.io

---

## License

This project is licensed under the **Apache License 2.0**

Copyright 2026 Tharvesh Muhaideen

Licensed under the Apache License, Version 2.0
You may not use this file except in compliance with the License.

---

## Support

If you like this project:
-  Star the repository
-  Fork it
-  Contribute improvements
