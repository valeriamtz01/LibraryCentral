import { useState } from 'react';
import floor2Img from '../assets/floor2.png'; 
import floor3Img from '../assets/floor3.png'; 

interface FloorMapProps {
  floor: number;
  onRoomSelect: (roomName: string) => void; // callback function to notify parent component when a room is selected

  statuses: Record<string,string>; // to retrieve mock data representing the current "Live" status of the library, which will be used to dynamically update the appearance of the room hotspots on the map (e.g. green for available, red for occupied, etc.)
}


const FloorMap = ({ floor, onRoomSelect, statuses }: FloorMapProps) => {
    // this state will track which room the user clicked on
    //const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null); // this state will track which room the user is currently hovering over with their mouse - we can use this to show a tooltip with the room name, status, etc. when they hover over a hotspot on the map

    const currentMap = floor === 2 ? floor2Img : floor3Img; // select the correct floor image based on the "floor" prop

    // to determine color based on data
    const getRoomStyle = (roomName: string) => {
        const status = statuses[roomName] || "available"; // get the current status of the room from the backend (if no status record => asumme room is free)
        
        // for now we'll just use a simple color scheme where "available" rooms are green and "occupied" rooms are red, but later we can expand this to include more status types and corresponding colors (e.g. yellow for "reserved", gray for "out of service", etc.)
        // if (status === "occupied") return "border-danger bg-danger";
        // return "border-success bg-success";

        // determine based on status 
        // reserved = red border 
        switch (status) {
            case "reserved":
                return "border-danger bg-danger";  // red, clickable
            default:
                return "border-success bg-success"; // green
        }
    };

    const handleRoomClick = (roomName: string) => {

        //setSelectedRoom(roomName);
        // if (statuses[roomName] === "occupied") {
        // alert("This space is already reserved!");
        // return;
        // }

        const status = statuses[roomName] || "available";

        if (status === "reserved") {
            alert("This room is currently reserved, but you can reserve it for another time.");
        }

        onRoomSelect(roomName); // notify parent component of the selected room
    };

    return (
        <div className="floor-map-container position-relative bg-white rounded shadow-sm overflow-hidden">
        {/* base image */}
        <img 
            src={currentMap}  // dynamically load the correct floor map image based on the "floor" prop
            alt={`Library Floor ${floor}`}  // alt text for accessibility
            className="img-fluid w-100" 
            style={{ display: 'block' }}
        />

        {/* interactive overlay */}
        {/* using absolute positioning to place "Hotspots" over the rooms  for selection*/}
        <div 
            className="map-overlay position-absolute top-0 start-0 w-100 h-100"
            style={{ cursor: 'pointer' }}
        >
            {floor === 2 ? (
            <>
                {/* hotspot for Room 2.111 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.111")} bg-opacity-25`}
                style={{ top: '27.8%', left: '66.8%', width: '5.6%', height: '12.2%' }} 
                onClick={() => handleRoomClick("Room 2.111")}
                onMouseEnter={() => setHoveredRoom("Room 2.111")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100A")} bg-opacity-25`}
                style={{ top: '69.3%', left: '70.7%', width: '3.7%', height: '7.1%' }} 
                onClick={() => handleRoomClick("Room 2.100A")}
                onMouseEnter={() => setHoveredRoom("Room 2.100A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100B")} bg-opacity-25`}
                style={{ top: '69.3%', left: '74.4%', width: '3.7%', height: '7.1%' }} 
                onClick={() => handleRoomClick("Room 2.100B")}
                onMouseEnter={() => setHoveredRoom("Room 2.100B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100C")} bg-opacity-25`}
                style={{ top: '69.3%', left: '78.2%', width: '3.8%', height: '7.1%' }} 
                onClick={() => handleRoomClick("Room 2.100C")}
                onMouseEnter={() => setHoveredRoom("Room 2.100C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
            </>
            ) : (
            <>

                {/* hotspot for a Room 3.111A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111A")} bg-opacity-25`}
                style={{ top: '76%', left: '42.5%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.111A")}
                onMouseEnter={() => setHoveredRoom("Room 3.111A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111B")} bg-opacity-25`}
                style={{ top: '86.7%', left: '42.5%', width: '3.9%', height: '12.3%' }} 
                onClick={() => handleRoomClick("Room 3.111B")}
                onMouseEnter={() => setHoveredRoom("Room 3.111B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111C")} bg-opacity-25`}
                style={{ top: '92.5%', left: '38.8%', width: '3.9%', height: '6.5%' }} 
                onClick={() => handleRoomClick("Room 3.111C")}
                onMouseEnter={() => setHoveredRoom("Room 3.111C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111D")} bg-opacity-25`}
                style={{ top: '86.7%', left: '34.8%', width: '3.9%', height: '12.3%' }} 
                onClick={() => handleRoomClick("Room 3.111D")}
                onMouseEnter={() => setHoveredRoom("Room 3.111D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111E")} bg-opacity-25`}
                style={{ top: '76%', left: '34.8%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.111E")}
                onMouseEnter={() => setHoveredRoom("Room 3.111E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.125A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125A")} bg-opacity-25`}
                style={{ top: '36.9%', left: '56.5%', width: '4.2%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.125A")}
                onMouseEnter={() => setHoveredRoom("Room 3.125A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125B")} bg-opacity-25`}
                style={{ top: '22.9%', left: '56.5%', width: '4.2%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.125B")}
                onMouseEnter={() => setHoveredRoom("Room 3.125B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125C")} bg-opacity-25`}
                style={{ top: '22.9%', left: '60.6%', width: '3.9%', height: '8.7%' }} 
                onClick={() => handleRoomClick("Room 3.125C")}
                onMouseEnter={() => setHoveredRoom("Room 3.125C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125D")} bg-opacity-25`}
                style={{ top: '22.9%', left: '64.3%', width: '3.9%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.125D")}
                onMouseEnter={() => setHoveredRoom("Room 3.125D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125E")} bg-opacity-25`}
                style={{ top: '36.9%', left: '64.3%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.125E")}
                onMouseEnter={() => setHoveredRoom("Room 3.125E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.126A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126A")} bg-opacity-25`}
                style={{ top: '36.9%', left: '68.2%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.126A")}
                onMouseEnter={() => setHoveredRoom("Room 3.126A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126B")} bg-opacity-25`}
                style={{ top: '22.9%', left: '68.2%', width: '3.9%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.126B")}
                onMouseEnter={() => setHoveredRoom("Room 3.126B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126C")} bg-opacity-25`}
                style={{ top: '22.9%', left: '71.9%', width: '3.9%', height: '8.7%' }} 
                onClick={() => handleRoomClick("Room 3.126C")}
                onMouseEnter={() => setHoveredRoom("Room 3.126C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126D")} bg-opacity-25`}
                style={{ top: '22.9%', left: '75.7%', width: '5.2%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.126D")}
                onMouseEnter={() => setHoveredRoom("Room 3.126D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126E")} bg-opacity-25`}
                style={{ top: '36.9%', left: '75.7%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.126E")}
                onMouseEnter={() => setHoveredRoom("Room 3.126E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.127A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127A")} bg-opacity-25`}
                style={{ top: '36.9%', left: '79.6%', width: '3.9%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.127A")}
                onMouseEnter={() => setHoveredRoom("Room 3.127A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.127B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127B")} bg-opacity-25`}
                style={{ top: '22.9%', left: '80.7%', width: '5.8%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.127B")}
                onMouseEnter={() => setHoveredRoom("Room 3.127B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.127C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127C")} bg-opacity-25`}
                style={{ top: '22.9%', left: '86.5%', width: '6.8%', height: '14%' }} 
                onClick={() => handleRoomClick("Room 3.127C")}
                onMouseEnter={() => setHoveredRoom("Room 3.127C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>

            </>
            )}
        </div>


        {/* hover label*/}
        {hoveredRoom && (
        <div className="position-absolute top-0 start-50 translate-middle-x mt-2 badge bg-dark">
          {hoveredRoom} ({statuses[hoveredRoom] || "available"})
        </div>
      )}
    </div>
    );
};

export default FloorMap;