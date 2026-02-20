# Rentals API Architectural Blueprint

## 1. System Architecture: Hexagonal (Ports & Adapters)
The system is designed to isolate business logic (The Core) from external infrastructure. This allows for swapping the database or authentication provider without modifying the rental processing logic.

- Core: Contains the Rental Entity and Use Cases.
- Ports: Interfaces defining the communication contract.
- Adapters: Implementation of the Ports (Express, Auth, ORM).

## 2. Directory Structure
<img width="870" height="382" alt="image" src="https://github.com/user-attachments/assets/712f0eda-2ded-4363-ae73-8bc6d944c6d0" />



## 3. Data Model & Logic
Table Name: rentals

- id: UUID (Primary Key)
- customer_name: String
- start_date: Date
- end_date: Date
- gross_revenue: Decimal
- profit: Decimal (Calculated before persistence)

Business Logic (Domain Entity):
Profit = Gross - (Gross * 0.10) - 250.00 
- 10% Service fee 
- 250.00 Flat Cleaning Fee

## 4. Execution Flow
1. Express Adapter receives POST request.
2. Adapter calls Auth Port to validate the session.
3. Adapter passes data to CreateRental Use Case.
4. Use Case instantiates Rental Entity (Profit is calculated automatically).
5. Use Case calls Database Port to save the Entity.
6. Database Adapter executes SQL and returns the result.
7. Express Adapter returns 201 Created to the client.

## 5. Testing Strategy
- Unit Testing (Jest): Focus on domain/entities and domain/use-cases.
- Mocking: Use Jest mocks for IDatabasePort and IAuthPort.
- Integration Testing: Focus on adapters/db to ensure SQL constraints (like overlapping date prevention) work correctly.

## 6. Implementation Roadmap
Phase 1: Define IDatabasePort and IAuthPort interfaces.
Phase 2: Create Rental Entity with profit calculation logic.
Phase 3: Create CreateRental Use Case and write Jest unit tests with mocked ports.
Phase 4: Implement SQL Adapter (DB) and HTTP Adapter (Express).
Phase 5: Initialize dependencies in main.ts.
