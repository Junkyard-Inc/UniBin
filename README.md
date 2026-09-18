# UniBin
A simple yet useful web application for finding trash bins across the universe

## Tech Stack

| Layer              | Tecnologia        | Versione / Note                           |
| ------------------ | ----------------- | ----------------------------------------- |
| Frontend           | REACT / Bun       |                                           |
| Web server / Proxy | Nginx             | Alpine                                    |
| Backend            | TypeScript        | Global prefix /api                        |
| Message broker     | RabbitMQ          | 3 (management-alpine)                     | 
| ORM                | TypeORM           | migrations, synchronize disabilitato      |
| Database           | PostgreSQL        | 16 Alpine                                 |
| Orchestrazione     | Docker Compose    | —                                         |
| Runtime            | Bun / Dino        | 24+                                       |

### Maps

- OpenstreetMap and MapTiler for maop management.
- Find another manager for geographic coordinates. (epsg.io)

## Functionality

### 1. User types

- Admin ("Netturbino")
- Registered User
- Unregistered user

<details>
<summary>Click to expand</summary>

#### What an unregistered user can do

- Access to basic functionalities of the app
- Visualize trash bins on the map
- Navigate to a certain trash bin

#### What a registered user can do

- Everything that the unregistered user can do
- Save trash bin location
- Report current state of a trash bin
- Add/Report new trash bins
- Review other users

#### What an admin can do

- Everything that the registered user can do
- Confirm the existence of a newly added trash bin
- Delete a reported trash bin
- Change trash bin status
- Change registered users ratings 
- Ban users (Incinerator)

</details>

### 2. Reporting a new trash bin

<details>
<summary>Click to expand</summary>

When a user wants to report a new trash bin, the application will automatically save the user's position and save it as the bin real position. <br>
It will then ask what type of bin want to report. (bin types will be explained [here](#trash-bin)) <br>
The user must specify the current state of the trash bin. (bin states will be explained [here](#trash-bin)) <br>
(maybe) Before being published the report must be approved by an admin. (It can still be published but labeled as "not yet reviewed by an admin") <br>
All the limits for reports are better explained [here](#4-waze-like-trust-system)

</details>

### 3. Reviewing a trash bin

<details>
<summary>Click to expand</summary>

When a user comes near a specific trash bin or arrives at the desired bin (through navigation) it will be prompted about the current status of the bin, here the user can confirm the current status or change it. <br>
The opinion of a user with a higher rank will weigh more than the one from a user of a lesser rank. (user ranking system is explained in detail [here](#4-waze-like-trust-system))<br>
Admins can change the state of a bin when they feel to.

#### Automatic trash bin removal

A trash bin can be manually removed by an admin or it can automatically be removed. <br>
If a bin state is set to "removed" for more than two weeks (14 consecutive days) the trash bin will be automatically removed (or simply not visible anymore).

</details>

### 4. "Waze-like" trust system

Users will be categorized using a ranking system based on their reliability:

- "Re dei monnezzari" (Most realiable user)
- "Monnezzaro"
- "Monnezzaro jr" (Starting rank)
- "Troll delle discariche"
- "Rifiuto della società" (Least reliable user)

<details>
<summary>Click to expand</summary>

> [!IMPORTANT]
> Rank calculation is yet to be defined.

The rank will be calculated based on other user's reviews:
- if a user reports a new trash bin even if there is no bin at all an automatic negative review will be added to the user that initially reported the trash bin.
- the admin can change the rank of a specific user.



There will be a rate limit based on the rank of the user:
- a user with a higher rank can report more new trash bins weekly than a user with a lower rank.
- a user with a higher rank can report a new state for a trash bin while a user with a lower rank will be limited to only nearby trash bins and can do it only once a week for a single trash bin.

</details>

### 5. Searching

<details>
<summary>Click to expand</summary>

- Trash bin type filtering
- Zone research: enter a street/city/position, and it will show you nearby trash cans on the map in a given radius
- Area around current position: shows nearby trash bins in a given radius

</details>

### 6. Security and Spam Protection

<details>
<summary>Click to expand</summary>

- Separate database for user credentials
- Spam/flood protection: throttling (limit of requests and reports per minute)
- DDOS attacks:
- SQL injections:
- Hashing passwords
- HTTPS

</details>

### 7. Future Features

<details>
<summary>Click to expand</summary>

- Achievement system

</details>

## Database Entities

### User

A user is defined by:

- e-mail
- username
- password
- profile picture (only the ones provided by the app)
- rank (defined [here](#4-waze-like-trust-system))
- role (admin: non admin)
- date of registration
- active bin reports

### Trash Bin

A trash bin is defined by:

- coordinates (latitude; longitude)
- type {General Waste; Food Waste, Plastic, Paper, Glass, Clothing, Green Waste, Oil, Batteries, Cigarette Butts,...}
- status
- user who reported the bin
- number of "reviews"
- general info (e.g. "this bin is only accessible if you live in this town",...)

## Design Language

Inspired by Frutiger Aero design aesthetic.
