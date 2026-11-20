import { Server as SocketIOServer } from 'socket.io';
import { createLogger } from '@elastinode/shared';

const logger = createLogger('autoscaler-socket');

export function createSocketServer(httpServer, controller) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Dashboard client connected via Socket.IO');

    socket.emit('servers', controller.getServerList());
    socket.emit('policy-updated', controller.policy.getConfig());
    const latestMetrics = controller.metricsStore.last(1)[0];
    if (latestMetrics) {
      socket.emit('metrics', latestMetrics);
    }

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Dashboard client disconnected');
    });
  });

  controller.on('metrics', (snapshot) => {
    io.emit('metrics', snapshot);
  });

  controller.on('servers', (serverList) => {
    io.emit('servers', serverList);
  });

  controller.on('scaling:event', (eventData) => {
    io.emit('scaling-event', eventData);
  });

  function broadcastPolicyUpdated(policyConfig) {
    io.emit('policy-updated', policyConfig);
  }

  return { io, broadcastPolicyUpdated };
}

export default createSocketServer;
