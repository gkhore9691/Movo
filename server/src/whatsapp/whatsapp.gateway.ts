import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class WhatsAppGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WhatsAppGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const tenantId = payload.tenantId;
      if (tenantId) {
        client.join(`tenant:${tenantId}`);
        this.logger.log(`Client connected to tenant:${tenantId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug('Client disconnected');
  }

  emitNewMessage(tenantId: string, conversationId: string, message: any) {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('newMessage', { conversationId, message });
  }

  emitConnectionStatus(
    tenantId: string,
    status: { connected: boolean; qr?: string | null; phoneNumber?: string },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('waStatus', status);
  }

  emitQR(tenantId: string, qr: string) {
    this.server.to(`tenant:${tenantId}`).emit('waQR', { qr });
  }
}
