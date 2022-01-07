import React from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface AlertInterface {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  text: string
  title: string
}

/**
 * An alert component
 */
export const Alert = ({ isOpen, setIsOpen, text, title }: AlertInterface) => (
  <Transition.Root show={isOpen} as={React.Fragment}>
    <Dialog
      as="div"
      className="fixed inset-0 z-10 overflow-y-auto"
      onClose={setIsOpen}
    >
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        </Transition.Child>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  {title && (
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                  )}
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{text}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition.Root>
)

export default Alert
