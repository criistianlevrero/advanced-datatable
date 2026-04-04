FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY . .

RUN npm install --include=dev \
  && npm --workspace @advanced-datatable/mock-backend run build

EXPOSE 3001

CMD ["npm", "--workspace", "@advanced-datatable/mock-backend", "run", "start"]
