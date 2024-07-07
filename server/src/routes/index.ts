import { FastifyInstance } from 'fastify';
import { SubscriberController } from '../controllers/SubscriberController';
import { AuthController } from '../controllers/authController';
import { NotificationController } from '../controllers/NotificationController';
import { AlertController } from '../controllers/alertController';
import { authHook } from '../hooks/auth';

const subscriberController = new SubscriberController();
const authController = new AuthController();
const notificationController = new NotificationController();
const alertController = new AlertController();

export async function routes(fastify: FastifyInstance) {
  fastify.post('/subscribers', (request, reply) => subscriberController.create(request, reply));
  fastify.put('/subscribers', (request, reply) => subscriberController.update(request, reply));

  fastify.post('/auth/subscribers/otp', (request, reply) => authController.authOtp(request, reply));
  fastify.post('/auth/subscribers', (request, reply) => authController.loginSubscriber(request, reply));
  fastify.post('/auth/admin', (request, reply) => authController.loginAdmin(request, reply));

  fastify.post('/notifications', (request, reply) => notificationController.create(request, reply));
  fastify.get('/notifications/:phone', (request, reply) => notificationController.show(request, reply));

  fastify.post('/alerts', { preHandler: authHook }, (request, reply) => alertController.create(request, reply));
  fastify.get('/alerts', (request, reply) => alertController.list(request, reply));
}
