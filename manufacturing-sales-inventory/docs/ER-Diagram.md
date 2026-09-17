# ER Diagram - Manufacturing Sales & Inventory Management System

## Relationship overview

```
User (login only, no business FK)

Customer  1 ----- N  Enquiry
Customer  1 ----- N  Quotation
Customer  1 ----- N  SalesOrder

Enquiry   1 ----- N  EnquiryItem     N ----- 1  Product
Enquiry   1 ----- N  Quotation       (optional reference)

Quotation 1 ----- N  QuotationItem   N ----- 1  Product
Quotation 1 ----- 1  SalesOrder      (unique -> no duplicate conversion)

SalesOrder 1 ---- N  SalesOrderItem  N ----- 1  Product
SalesOrder 1 ---- 1  Dispatch        (unique -> no duplicate dispatch)

Dispatch  1 ----- N  DispatchItem

Product   1 ----- 1  Inventory       (physicalQty, reservedQty)
```

## Mermaid diagram

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string email
        string passwordHash
        enum role
    }
    CUSTOMER {
        int id PK
        string company
        string contact
        string mobile
        string email
        string city
    }
    PRODUCT {
        int id PK
        string code
        string name
        string category
        string unit
        decimal basePrice
    }
    INVENTORY {
        int id PK
        int productId FK
        int physicalQty
        int reservedQty
    }
    ENQUIRY {
        int id PK
        string enquiryNo
        int customerId FK
        datetime enquiryDate
        datetime requiredDate
        string notes
        enum status
    }
    ENQUIRYITEM {
        int id PK
        int enquiryId FK
        int productId FK
        int quantity
    }
    QUOTATION {
        int id PK
        string quotationNo
        int enquiryId FK
        int customerId FK
        enum status
        datetime validUntil
        decimal totalAmount
    }
    QUOTATIONITEM {
        int id PK
        int quotationId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal discountPct
        decimal gstPct
        decimal lineAmount
    }
    SALESORDER {
        int id PK
        string orderNo
        int customerId FK
        int quotationId FK
        datetime orderDate
        decimal totalAmount
        enum status
    }
    SALESORDERITEM {
        int id PK
        int salesOrderId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal lineAmount
    }
    DISPATCH {
        int id PK
        string dispatchNo
        int salesOrderId FK
        datetime dispatchDate
        string vehicleNo
        string driverName
    }
    DISPATCHITEM {
        int id PK
        int dispatchId FK
        int productId
        int quantity
    }

    CUSTOMER ||--o{ ENQUIRY : raises
    CUSTOMER ||--o{ QUOTATION : receives
    CUSTOMER ||--o{ SALESORDER : places
    ENQUIRY ||--o{ ENQUIRYITEM : contains
    ENQUIRY ||--o{ QUOTATION : quoted_by
    QUOTATION ||--o{ QUOTATIONITEM : contains
    QUOTATION ||--|| SALESORDER : converted_to
    SALESORDER ||--o{ SALESORDERITEM : contains
    SALESORDER ||--|| DISPATCH : dispatched_by
    DISPATCH ||--o{ DISPATCHITEM : contains
    PRODUCT ||--|| INVENTORY : stocked_as
    PRODUCT ||--o{ ENQUIRYITEM : used_in
    PRODUCT ||--o{ QUOTATIONITEM : used_in
    PRODUCT ||--o{ SALESORDERITEM : used_in
```

## Key constraints

| Constraint | Purpose |
|---|---|
| `User.email` unique | one account per email |
| `Product.code` unique | unique product code |
| `Inventory.productId` unique | one stock row per product |
| `Enquiry.enquiryNo`, `Quotation.quotationNo`, `SalesOrder.orderNo`, `Dispatch.dispatchNo` unique | unique document numbers |
| `SalesOrder.quotationId` unique | a quotation can be converted only once |
| `Dispatch.salesOrderId` unique | an order can be dispatched only once |
| `physicalQty >= reservedQty` (validated in backend) | available quantity can never go negative |

## Status fields

| Model | Statuses |
|---|---|
| User.role | ADMIN, SALES_USER |
| Enquiry.status | NEW, QUOTED, WON, LOST |
| Quotation.status | DRAFT, SENT, ACCEPTED, REJECTED |
| SalesOrder.status | PENDING, CONFIRMED, DISPATCHED, CANCELLED |
