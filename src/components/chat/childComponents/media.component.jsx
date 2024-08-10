import React, { useContext } from 'react';
import { DialogContext } from '../../../context/dialog.context';

const Media = () => {
	const { setOpenMediaDialog } = useContext(DialogContext);

	return (
		<>
			<div className="bg-secondary md:w-6/12 w-10/12 h-96 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md z-10">
				<div>
					<p>Content</p>
				</div>
				<div>
					<button onClick={() => setOpenMediaDialog(false)}>
						Close
					</button>
				</div>
			</div>
		</>
	);
};

export default Media;
