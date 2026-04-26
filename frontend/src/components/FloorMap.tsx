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
        console.log(roomName, statuses[roomName]);
        const status = statuses[roomName] || "available"; // get the current status of the room from the backend (if no status record => asumme room is free)
        
        // for now we'll just use a simple color scheme where "available" rooms are green and "occupied" rooms are red, but later we can expand this to include more status types and corresponding colors (e.g. yellow for "reserved", gray for "out of service", etc.)
        // if (status === "occupied") return "border-danger bg-danger";
        // return "border-success bg-success";

        // determine based on status 
        // reserved = red border 
        switch (status) {
            case "occupied":
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

        if (status === "reserved" || status === "occupied") {
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
                style={{ top: '19%', left: '66.5%', width: '5.7%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 2.111")}
                onMouseEnter={() => setHoveredRoom("Room 2.111")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100A")} bg-opacity-25`}
                style={{ top: '66%', left: '71.5%', width: '3.8%', height: '7.4%' }} 
                onClick={() => handleRoomClick("Room 2.100A")}
                onMouseEnter={() => setHoveredRoom("Room 2.100A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100B")} bg-opacity-25`}
                style={{ top: '66%', left: '75.6%', width: '3.8%', height: '7.4%' }} 
                onClick={() => handleRoomClick("Room 2.100B")}
                onMouseEnter={() => setHoveredRoom("Room 2.100B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Room 2.100C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 2.100C")} bg-opacity-25`}
                style={{ top: '66%', left: '79.6%', width: '3.8%', height: '7.4%' }} 
                onClick={() => handleRoomClick("Room 2.100C")}
                onMouseEnter={() => setHoveredRoom("Room 2.100C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>

                {/* hotspot for Computer 1 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.1")} bg-opacity-25`}
                style={{ top: '36%', left: '49.9%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.1")}
                onMouseEnter={() => setHoveredRoom("Computer 2.1")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 2 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.2")} bg-opacity-25`}
                style={{ top: '36%', left: '52.1%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.2")}
                onMouseEnter={() => setHoveredRoom("Computer 2.2")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 3 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.3")} bg-opacity-25`}
                style={{ top: '36%', left: '54.1%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.3")}
                onMouseEnter={() => setHoveredRoom("Computer 2.3")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 4 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.4")} bg-opacity-25`}
                style={{ top: '36%', left: '60%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.4")}
                onMouseEnter={() => setHoveredRoom("Computer 2.4")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 5 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.5")} bg-opacity-25`}
                style={{ top: '36%', left: '62.1%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.5")}
                onMouseEnter={() => setHoveredRoom("Computer 2.5")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 6 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.6")} bg-opacity-25`}
                style={{ top: '36%', left: '64.1%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.6")}
                onMouseEnter={() => setHoveredRoom("Computer 2.6")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 7 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.7")} bg-opacity-25`}
                style={{ top: '36%', left: '70.4%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.7")}
                onMouseEnter={() => setHoveredRoom("Computer 2.7")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 8 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.8")} bg-opacity-25`}
                style={{ top: '36%', left: '72.4%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.8")}
                onMouseEnter={() => setHoveredRoom("Computer 2.8")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 9 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.9")} bg-opacity-25`}
                style={{ top: '36%', left: '74.5%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.9")}
                onMouseEnter={() => setHoveredRoom("Computer 2.9")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 10 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.10")} bg-opacity-25`}
                style={{ top: '55%', left: '65.6%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.10")}
                onMouseEnter={() => setHoveredRoom("Computer 2.10")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 11 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.11")} bg-opacity-25`}
                style={{ top: '55%', left: '67.7%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.11")}
                onMouseEnter={() => setHoveredRoom("Computer 2.11")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 12 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.12")} bg-opacity-25`}
                style={{ top: '55%', left: '69.8%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.12")}
                onMouseEnter={() => setHoveredRoom("Computer 2.12")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 13 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.13")} bg-opacity-25`}
                style={{ top: '55%', left: '73.4%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.13")}
                onMouseEnter={() => setHoveredRoom("Computer 2.13")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 14 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.14")} bg-opacity-25`}
                style={{ top: '55%', left: '75.5%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.14")}
                onMouseEnter={() => setHoveredRoom("Computer 2.14")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for Computer 15 */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Computer 2.15")} bg-opacity-25`}
                style={{ top: '55%', left: '77.5%', width: '1.3%', height: '3%' }} 
                onClick={() => handleRoomClick("Computer 2.15")}
                onMouseEnter={() => setHoveredRoom("Computer 2.15")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>

            </>
            ) : (
            <>

                {/* hotspot for a Room 3.111A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111A")} bg-opacity-25`}
                style={{ top: '62%', left: '44.3%', width: '3.6%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.111A")}
                onMouseEnter={() => setHoveredRoom("Room 3.111A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111B")} bg-opacity-25`}
                style={{ top: '71.7%', left: '45%', width: '3%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.111B")}
                onMouseEnter={() => setHoveredRoom("Room 3.111B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111C")} bg-opacity-25`}
                style={{ top: '74.5%', left: '41.4%', width: '3.2%', height: '6.2%' }} 
                onClick={() => handleRoomClick("Room 3.111C")}
                onMouseEnter={() => setHoveredRoom("Room 3.111C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111D")} bg-opacity-25`}
                style={{ top: '71.7%', left: '37.7%', width: '3.5%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.111D")}
                onMouseEnter={() => setHoveredRoom("Room 3.111D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.111E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.111E")} bg-opacity-25`}
                style={{ top: '62%', left: '37.7%', width: '3.6%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.111E")}
                onMouseEnter={() => setHoveredRoom("Room 3.111E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.125A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125A")} bg-opacity-25`}
                style={{ top: '27.8%', left: '55.4%', width: '4.2%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.125A")}
                onMouseEnter={() => setHoveredRoom("Room 3.125A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125B")} bg-opacity-25`}
                style={{ top: '16%', left: '55.4%', width: '3.3%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.125B")}
                onMouseEnter={() => setHoveredRoom("Room 3.125B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125C")} bg-opacity-25`}
                style={{ top: '16%', left: '59.1%', width: '3.3%', height: '7%' }} 
                onClick={() => handleRoomClick("Room 3.125C")}
                onMouseEnter={() => setHoveredRoom("Room 3.125C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125D")} bg-opacity-25`}
                style={{ top: '16%', left: '63%', width: '3.3%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.125D")}
                onMouseEnter={() => setHoveredRoom("Room 3.125D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.125E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.125E")} bg-opacity-25`}
                style={{ top: '27.8%', left: '62.5%', width: '3.8%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.125E")}
                onMouseEnter={() => setHoveredRoom("Room 3.125E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.126A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126A")} bg-opacity-25`}
                style={{ top: '27.8%', left: '66.8%', width: '3.9%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.126A")}
                onMouseEnter={() => setHoveredRoom("Room 3.126A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126B")} bg-opacity-25`}
                style={{ top: '16%', left: '66.8%', width: '3.3%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.126B")}
                onMouseEnter={() => setHoveredRoom("Room 3.126B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126C")} bg-opacity-25`}
                style={{ top: '16%', left: '70.5%', width: '3.3%', height: '6.9%' }} 
                onClick={() => handleRoomClick("Room 3.126C")}
                onMouseEnter={() => setHoveredRoom("Room 3.126C")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126D */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126D")} bg-opacity-25`}
                style={{ top: '16%', left: '74.2%', width: '3.7%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.126D")}
                onMouseEnter={() => setHoveredRoom("Room 3.126D")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.126E */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.126E")} bg-opacity-25`}
                style={{ top: '27.8%', left: '73.9%', width: '3.1%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.126E")}
                onMouseEnter={() => setHoveredRoom("Room 3.126E")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>


                {/* hotspot for a Room 3.127A */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127A")} bg-opacity-25`}
                style={{ top: '27.8%', left: '77.2%', width: '2.9%', height: '9%' }} 
                onClick={() => handleRoomClick("Room 3.127A")}
                onMouseEnter={() => setHoveredRoom("Room 3.127A")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.127B */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127B")} bg-opacity-25`}
                style={{ top: '16%', left: '78.3%', width: '3.8%', height: '11%' }} 
                onClick={() => handleRoomClick("Room 3.127B")}
                onMouseEnter={() => setHoveredRoom("Room 3.127B")}
                onMouseLeave={() => setHoveredRoom(null)}
                ></div>
                {/* hotspot for a Room 3.127C */}
                <div 
                className={`room-hotspot position-absolute border ${getRoomStyle("Room 3.127C")} bg-opacity-25`}
                style={{ top: '16%', left: '82.4%', width: '4.6%', height: '11%' }} 
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