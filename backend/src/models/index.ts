export const MAX_PLAYERS_PER_ROOM = 10;

export type Player = {
  id: string;
  name: string;
  joinedAt: string;
};

export type RoomState = {
  roomId: string;
  createdAt: string;
  players: Player[];
};

export type CreateRoomInput = {
  creatorId: string;
  creatorName: string;
};

export type AddPlayerInput = {
  roomId: string;
  playerId: string;
  playerName: string;
};

export type RemovePlayerInput = {
  roomId: string;
  playerId: string;
};

export type JoinRoomPayload = {
  roomId: string;
  playerId: string;
  playerName: string;
};

export type LeaveRoomPayload = {
  roomId: string;
  playerId: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};
