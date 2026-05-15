 import React from 'react';
import {useState} from 'react';

export interface StartMenuButtonProps {
    label: string;
}

export const StartMenuButton = ({ label} : StartMenuButtonProps) => {

    //let isOpen = false; // This variable will not cause a re-render when it changes, so the button label won't update correctly. 
    // This is why it is called React! React needs to know when to re-render components, and it does this by tracking state. 
    // If you use a regular variable, React has no way of knowing that it changed and won't update the UI.
   
    const [isOpen, setIsOpen] = useState(false); //Must use a react state to track if the menu is open or closed
    // [currentSate, setState] = useState(initialValue) is the syntax for using the useState hook.
    // isOpen is the current state value, and setIsOpen is the function we call to update that state. 
    // When we call setIsOpen, React will re-render the component with the new state value, allowing us to update the button label accordingly.
    
    const handleClick = () => {
        setIsOpen(!isOpen)
        // isOpen = !isOpen; <---- this does not work because isOpen is a prop. props are read only. You cannot directly modify them.
    }
    
    return(
        <button onClick = {handleClick}>{isOpen ? "close Menu" : label}</button>
    )
}