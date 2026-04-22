import path from "node:path";

import swaggerJSDoc, { type Options } from "swagger-jsdoc";

import { config } from "./env";

const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Planora Backend API",
      version: "1.0.0",
      description: "API documentation for Planora backend services.",
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: "Local server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and account session operations" },
      { name: "Event", description: "Event browsing and management operations" },
      { name: "Participation", description: "Event participation and host approval operations" },
      { name: "Payment", description: "Payment initiation, verification, and history operations" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiResponseEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            statusCode: { type: "integer", example: 200 },
            message: { type: "string", example: "Request successful" },
            data: { nullable: true },
          },
          required: ["success", "statusCode", "message"],
        },
        ApiErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            statusCode: { type: "integer", example: 400 },
            message: { type: "string", example: "Validation error" },
            errorSources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string", example: "email" },
                  message: { type: "string", example: "Enter a valid email address" },
                },
              },
            },
          },
          required: ["success", "statusCode", "message"],
        },
        AuthRegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 50, example: "Rakib Hasan" },
            email: { type: "string", format: "email", example: "rakib@example.com" },
            password: { type: "string", minLength: 8, example: "Password123" },
          },
        },
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "rakib@example.com" },
            password: { type: "string", example: "Password123" },
          },
        },
        AuthVerifyEmailRequest: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email", example: "rakib@example.com" },
            otp: { type: "string", pattern: "^\\d{6}$", example: "123456" },
          },
        },
        AuthForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "rakib@example.com" },
          },
        },
        AuthResetPasswordRequest: {
          type: "object",
          required: ["email", "otp", "newPassword", "confirmPassword"],
          properties: {
            email: { type: "string", format: "email", example: "rakib@example.com" },
            otp: { type: "string", pattern: "^\\d{6}$", example: "123456" },
            newPassword: { type: "string", minLength: 8, example: "Password123" },
            confirmPassword: { type: "string", minLength: 8, example: "Password123" },
          },
        },
        AuthChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword", "confirmPassword"],
          properties: {
            currentPassword: { type: "string", example: "OldPassword123" },
            newPassword: { type: "string", minLength: 8, example: "NewPassword123" },
            confirmPassword: { type: "string", minLength: 8, example: "NewPassword123" },
          },
        },
        EventCreateRequest: {
          type: "object",
          required: ["title", "description", "dateTime", "venue", "isPublic", "isPaid"],
          properties: {
            title: { type: "string", maxLength: 150, example: "Planora Community Meetup" },
            description: { type: "string", maxLength: 5000, example: "Monthly meetup for backend engineers." },
            dateTime: { type: "string", format: "date-time", example: "2026-05-10T18:00:00.000Z" },
            venue: { type: "string", maxLength: 300, example: "Dhaka Convention Hall" },
            isPublic: { type: "boolean", example: true },
            isPaid: { type: "boolean", example: false },
            fee: { type: "number", minimum: 0, example: 0 },
          },
        },
        EventUpdateRequest: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 150, example: "Updated event title" },
            description: { type: "string", maxLength: 5000, example: "Updated event details." },
            dateTime: { type: "string", format: "date-time", example: "2026-05-11T18:00:00.000Z" },
            venue: { type: "string", maxLength: 300, example: "Updated venue" },
            isPublic: { type: "boolean", example: false },
            isPaid: { type: "boolean", example: true },
            fee: { type: "number", minimum: 0, example: 250 },
          },
        },
        PaginationQuery: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "../modules/auth/*.routes.ts"),
    path.join(__dirname, "../modules/event/*.route.ts"),
    path.join(__dirname, "../modules/participation/*.route.ts"),
    path.join(__dirname, "../modules/payment/*.route.ts"),
    path.join(__dirname, "../modules/auth/*.routes.js"),
    path.join(__dirname, "../modules/event/*.route.js"),
    path.join(__dirname, "../modules/participation/*.route.js"),
    path.join(__dirname, "../modules/payment/*.route.js"),
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
