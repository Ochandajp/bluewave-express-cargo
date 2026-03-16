// ============= FIXED DISPLAY SHIPMENT DETAILS WITH ALL FIELDS =============
function displayShipmentDetails(shipment) {
    const resultDiv = document.getElementById('trackingResult');
    
    const statusClass = shipment.status ? shipment.status.toLowerCase().replace(/ /g, '') : 'pending';
    
    let progress = 0;
    switch(shipment.status?.toLowerCase()) {
        case 'pending': progress = 10; break;
        case 'on hold': progress = 20; break;
        case 'out for delivery': progress = 80; break;
        case 'delivered': progress = 100; break;
        default: progress = 50;
    }

    // Generate tracking history HTML
    let historyHtml = '';
    if (shipment.trackingHistory && shipment.trackingHistory.length > 0) {
        const sortedHistory = [...shipment.trackingHistory].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        sortedHistory.forEach(history => {
            const date = history.timestamp ? new Date(history.timestamp).toLocaleString() : '';
            
            const remarkHtml = history.remark ? 
                `<div class="history-remark">
                    <strong>📝 REMARKS:</strong> ${history.remark}
                </div>` : '';
            
            historyHtml += `
                <div class="history-item">
                    <span class="history-date">${date}</span>
                    <span class="history-status">${history.status || ''}</span>
                    <span class="history-location">📍 ${history.location || ''}</span>
                    ${history.message ? `<div style="color: #ccc; margin-top: 5px;">💬 ${history.message}</div>` : ''}
                    ${remarkHtml}
                </div>
            `;
        });
    }

    // Format dates
    const departureDate = shipment.departureDate ? new Date(shipment.departureDate).toLocaleDateString() : 'Not set';
    const pickupDate = shipment.pickupDate ? new Date(shipment.pickupDate).toLocaleDateString() : 'Not set';
    const expectedDelivery = shipment.expectedDelivery ? new Date(shipment.expectedDelivery).toLocaleDateString() : 'Not set';
    
    // Show TBA for freight cost if not set
    let freightDisplay = '<span class="freight-tba">TBA</span>';
    if (shipment.freightCost !== undefined && shipment.freightCost !== null && shipment.freightCost > 0) {
        freightDisplay = `<span class="freight-cost">£${shipment.freightCost.toFixed(2)}</span>`;
    } else if (shipment.freightCost === 0) {
        freightDisplay = '<span class="freight-cost">£0.00</span>';
    }

    // Package Description display
    const packageDescription = shipment.description || shipment.product || 'No description provided';

    resultDiv.innerHTML = `
        <div class="tracking-header">
            <span class="tracking-number">Tracking #: ${shipment.trackingNumber || ''}</span>
            <span class="tracking-status status-${statusClass}">${shipment.status || 'Pending'}</span>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%;"></div>
        </div>

        <div class="tracking-grid">
            <div class="info-card">
                <h3>📦 Shipment Details</h3>
                <div class="info-row">
                    <span class="info-label">Departure:</span>
                    <span class="info-value">${departureDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Pickup:</span>
                    <span class="info-value">${pickupDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Package Type:</span>
                    <span class="info-value">${shipment.packageType || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Package Status:</span>
                    <span class="info-value">${shipment.packageStatus || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Carrier:</span>
                    <span class="info-value">${shipment.carrier || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Type:</span>
                    <span class="info-value">${shipment.shipmentType || 'Not specified'}</span>
                </div>
            </div>

            <div class="info-card">
                <h3>📋 Package Details</h3>
                <div class="info-row">
                    <span class="info-label">Description:</span>
                    <span class="info-value">${packageDescription}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Product:</span>
                    <span class="info-value">${shipment.product || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Quantity:</span>
                    <span class="info-value">${shipment.quantity || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Weight:</span>
                    <span class="info-value">${shipment.weight || '0'} kg</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dimensions:</span>
                    <span class="info-value">${shipment.length || '0'}x${shipment.width || '0'}x${shipment.height || '0'} cm</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Piece Type:</span>
                    <span class="info-value">${shipment.pieceType || 'Not specified'}</span>
                </div>
            </div>

            <div class="info-card">
                <h3>📍 Location Info</h3>
                <div class="info-row">
                    <span class="info-label">Origin:</span>
                    <span class="info-value">${shipment.origin || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Destination:</span>
                    <span class="info-value">${shipment.destination || 'Not specified'}</span>
                </div>
            </div>

            <div class="info-card">
                <h3>📤 Sender Information</h3>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${shipment.senderName || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${shipment.senderEmail || 'Not provided'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${shipment.senderPhone || 'Not provided'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${shipment.senderAddress || 'Not provided'}</span>
                </div>
            </div>

            <div class="info-card">
                <h3>👤 Recipient Information</h3>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${shipment.recipientName || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${shipment.recipientPhone || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${shipment.recipientEmail || 'Not provided'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${shipment.deliveryAddress || 'N/A'}</span>
                </div>
            </div>

            <div class="info-card">
                <h3>💳 Payment Info</h3>
                <div class="info-row">
                    <span class="info-label">Mode:</span>
                    <span class="info-value">${shipment.paymentMode || 'Not specified'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Freight Cost:</span>
                    <span class="info-value">${freightDisplay}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Expected:</span>
                    <span class="info-value">${expectedDelivery}</span>
                </div>
            </div>
        </div>

        <div class="history-section">
            <h3 style="color: #00ffff; margin-bottom: 1rem;">📜 Tracking History</h3>
            <div class="history-timeline">
                ${historyHtml || '<p style="color: #888; text-align: center;">No tracking history available</p>'}
            </div>
        </div>
    `;
}