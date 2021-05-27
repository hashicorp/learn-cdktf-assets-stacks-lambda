# ink-confirm-input [![Build Status](https://travis-ci.org/kevva/ink-confirm-input.svg?branch=master)](https://travis-ci.org/kevva/ink-confirm-input)

> Confirmation input component for [Ink](https://github.com/vadimdemedes/ink)


## Install

```
$ npm install ink-confirm-input
```


## Usage

```js
import React, {useCallback, useState} from 'react';
import {render, Box} from 'ink';
import ConfirmInput from 'ink-confirm-input';

const UnicornQuestion = () => {
	const [answer, setAnswer] = useState();
	const [value, setValue] = useState('');
	const handleSubmit = useCallback(submitValue => {
		if (submitValue === false) {
			setAnswer({answer: 'You are heartless…'});
			return;
		}

		setAnswer({answer: 'You love unicorns!'});
	}, [setAnswer]);

	return (
		<Box>
			Do you like unicorns? (Y/n)

			<ConfirmInput
				isChecked
				value={value}
				onChange={setValue}
				onSubmit={handleSubmit}
			/>

			{answer && answer}
		</Box>
	);
};

render(<UnicornQuestion/>);
```


## API

### `<ConfirmInput/>`

#### Props

`<ConfirmInput/>` accepts the same props as [`<TextInput/>`](https://github.com/vadimdemedes/ink-text-input) in addition to the ones below.

##### isChecked

Type: `boolean`

Whether to return `true` or `false` by default.

##### value

Type: `string`

Value to display in a text input.

##### placeholder

Type: `string`

Text to display when `value` is empty.

##### onChange

Type: `Function`

Function to call when value updates. Returns a `string` with the input.

##### onSubmit

Type: `Function`

Function to call when user press <kbd>Enter</kbd>. Returns a `boolean` for the answer.
