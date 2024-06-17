import React from "react";
import "./chat.css";
import Messages from "./childComponents/messages.component";

const Chat = ({ inMobile }) => {
  return (
    <div className={`chat ${inMobile === "hidden" && "max-[650px]:hidden"}`}>
      <div className="top">
        <div className="userDetails">
          <img src="src\assets\profile.jpg" alt="profile" className="avatar" />
          <div className="currentStatus">
            <span className="text-black font-semibold text-base">John Doe</span>
            <p className="sub flex justify-between items-center bg-black py-0.5 px-2 rounded-xl">
              Active
              <span>
                <img src="src\assets\active.png" className="w-2 h-2 ml-3" />
              </span>
            </p>
          </div>
        </div>
        <div className="icons">
          <img
            src="src\assets\video.png"
            alt="video"
            className="w-8 h-8 mr-6"
          />
          <img
            src="src\assets\search.png"
            alt="video"
            className="w-6 h-6 mr-6"
          />
          <img src="src\assets\dots.png" alt="video" className="w-6 h-6 mr-4" />
        </div>
      </div>
      <div className="middle scrollbar-hide">
        <Messages />
      </div>
      <div className="bottom">
        <div className="inputContainer">
          <div className="inputEl">
            <img
              src="src\assets\happy.png"
              alt="emoji"
              className="w-6 h-6 ml-2 cursor-pointer"
            />
            <input
              type="text"
              placeholder="Type a message"
              className="w-full h-full outline-none px-4 md:m-3 bg-quatery"
            />
            <img
              src="src\assets\folder.png"
              alt="mic"
              className="w-6 h-6 mr-2 cursor-pointer"
            />
          </div>
          <div className="bg-quatery rounded-xl p-4 drop-shadow">
            <img
              src="src\assets\send.png"
              alt="send"
              className="w-8 h-8 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
