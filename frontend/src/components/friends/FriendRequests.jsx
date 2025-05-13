import React from 'react';
import RequestItem from './RequestItem';

const FriendRequests = ({ incoming, outgoing, onUpdate }) => {
  return (
    <div className="friend-requests">
      <div className="requests-section">
        <h4>Входящие запросы</h4>
        {incoming.length === 0 ? (
          <div className="empty">Нет новых запросов</div>
        ) : (
          incoming.map(request => (
            <RequestItem
              key={request.id}
              request={request}
              type="incoming"
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>

      <div className="requests-section">
        <h4>Исходящие запросы</h4>
        {outgoing.length === 0 ? (
          <div className="empty">Нет ожидающих запросов</div>
        ) : (
          outgoing.map(request => (
            <RequestItem
              key={request.id}
              request={request}
              type="outgoing"
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FriendRequests;