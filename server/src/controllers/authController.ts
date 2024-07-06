import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { redis } from '../database/redis';
import { db } from '../database';
import { generate6DigitsNumber } from '../utils/utils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';

export class AuthController {
  async authOtp(request: FastifyRequest, reply: FastifyReply) {
    const authSchema = z.object({
      otp: z.number(),
      deviceId: z.string()
    });
    const { otp, deviceId } = authSchema.parse(request.body);
    // buscar o nr
    const phone = await redis.get(`otp_${otp}`);
    // Verificar se existe
    if (!phone) {
      return reply.status(401).send({ error: 'OTP invalido' });
    }
    // Atualizar o user
    const subscriber = await db.subscriber.update({
      data: {
        deviceId,
        verified: true
      },
      where: {
        phone
      },
      include: {
        province: true,
        district: true
      }
    });
    // eliminar o otp
    await redis.delete(`otp_${otp}`);
    return reply.send(subscriber);
  }

  async loginSubscriber(request: FastifyRequest, reply: FastifyReply) {
    const subscriberSchema = z.object({
      phone: z.string().regex(/^8[2-7]\d{7}/)
    });
    const { phone } = subscriberSchema.parse(request.body);
    const subscriber = await db.subscriber.findUnique({
      where: {
        phone
      }
    });

    if (!subscriber) return reply.status(400).send({ error: 'Usuario nao encontrado' });

    const otp = generate6DigitsNumber();
    console.log(otp);
    await redis.set(`otp_${otp}`, phone, 60 * 3);
    return reply.status(204).send();
  }
  async loginAdmin(request: FastifyRequest, reply: FastifyReply) {
    const AdminSchema = z.object({
      email: z.string().email(),
      password: z.string()
    });
    const { email, password } = AdminSchema.parse(request.body);
    const admin = await db.admin.findFirst({
      where: {
        email
      }
    });
    if (!admin) return reply.status(401).send('Email ou password invalido');
    if (!(await bcrypt.compare(password, admin.password))) return reply.status(401).send('Email ou password invalido');

    const token = jwt.sign({ id: admin.id }, authConfig.secret, { expiresIn: authConfig.expiresIn });

    return reply.send({
      token,
      admin: {
        ...admin,
        password: undefined
      }
    });
  }
}
