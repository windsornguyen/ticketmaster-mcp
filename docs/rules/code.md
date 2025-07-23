# StoreScore Agent Architecture Code Rules

## Table of Contents

1. [North Star Principles](#north-star-principles)
2. [Agent Interface Design](#agent-interface-design)
3. [Pipeline Composition Rules](#pipeline-composition-rules)
4. [Layer Separation Rules](#layer-separation-rules)
5. [Testing Requirements](#testing-requirements)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Monitoring and Observability](#monitoring-and-observability)

## North Star Principles

### 1. User-Centric Development

- Every task must add intrinsic value to the business strategy team
- Focus on accurate brand/product matching for store inventory optimization
- Prioritize features that directly impact sales and revenue insights
- Design interfaces and reports for clarity and actionability

### 2. Results-Focused Implementation

- No task is complete without validation through testing
- All acceptance criteria must be measurable and testable
- Implementation must demonstrate real, actual results
- Continuous validation throughout development lifecycle

### 3. Walking Skeleton Approach

- Implement wide-and-shallow for complex features
- Establish complete data flow before deep implementation
- Create minimal working implementations for all components
- Focus on system integration before detailed functionality

### 4. Layer-First Design

- Strict separation of concerns
- Single Responsibility Principle at method level
- Promote modularity through clear layer boundaries
- Design for reusability through abstraction

### 5. Composition Over Inheritance

- Favor object composition over class inheritance
- Build complex behaviors from simple components
- Use dependency injection for flexibility
- Design for plug-and-play component replacement

### 6. Strong Encapsulation

- Package parameters in domain-specific payloads
- Return results in structured response objects
- Encode usage patterns in the type system
- Maintain clear boundaries between components
