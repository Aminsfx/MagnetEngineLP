> ## Documentation Index
> Fetch the complete documentation index at: https://docs.whop.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Embed checkout

> Learn how to embed Whop's checkout flow on your website

Embedded checkout allows you to embed Whop's checkout flow on your own website. This allows you to offer your customers a seamless checkout experience without leaving your website.

<Card title="Try the checkout playground" icon="sliders" href="https://whop.com/checkout-playground">
  Customize colors, radius, and fields in real time, then copy the generated embed code.
</Card>

<iframe width="100%" height="400" src="https://www.youtube.com/embed/0hGnAzwxd4g?si=0LDncN3P_MKfrsvD&rel=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />

## React setup

### Step 1: Install the package

```bash theme={null}
npm install @whop/checkout
```

### Step 2: Add the checkout element

```tsx theme={null}
import { WhopCheckoutEmbed } from "@whop/checkout/react";

export default function Home() {
	return (
		<WhopCheckoutEmbed
			planId="plan_XXXXXXXXX"
			returnUrl="https://yoursite.com/checkout/complete"
		/>
	);
}
```

This component will mount an iframe with the Whop checkout embed.

The `returnUrl` is required to handle redirects from external payment providers. When redirected, check the `status` query parameter:

* **success**: The payment succeeded. Use the receipt information to render a success page.
* **error**: The payment failed or was canceled. Remount the checkout so your customer can try again.

<Tip>
  Keep that Plan ID handy. You'll need to paste it into your website code, so
  save it somewhere you can find it.
</Tip>

### Step 3: **(optional)** Configure - Programmatic controls

To get access to the controls of the checkout embed, you can use the `ref` prop.

```tsx theme={null}
const ref = useCheckoutEmbedControls();

return <WhopCheckoutEmbed ref={ref} planId="plan_XXXXXXXXX" />;
```

#### **`submit`**

To submit checkout programmatically, you can use the `submit` method on the checkout element.

```tsx theme={null}
ref.current?.submit();
```

#### **`getEmail`**

To get the email of the user who is checking out, you can use the `getEmail` method on the checkout element.

```tsx theme={null}
const email = await ref.current?.getEmail();
console.log(email);
```

#### **`setEmail`**

To set the email of the user who is checking out, you can use the `setEmail` method on the checkout element.

```tsx theme={null}
try {
	await ref.current?.setEmail("example@domain.com");
} catch (error) {
	console.error(error);
}
```

#### **`getAddress`**

To get the address of the user who is checking out, you can use the `getAddress` method on the checkout element.

```tsx theme={null}
const address = await ref.current?.getAddress();
console.log(address);
```

#### **`setAddress`**

To set the address of the user who is checking out, you can use the `setAddress` method on the checkout element.

<Note>
  This method will only work if the address form is hidden. You can hide the
  address form by setting the `hideAddressForm` prop to `true`.
</Note>

```tsx theme={null}
try {
	await ref.current?.setAddress({
		name: "John Doe",
		country: "US",
		line1: "123 Main St",
		city: "Any Town",
		state: "CA",
		postalCode: "12345",
	});
} catch (error) {
	console.error(error);
}
```

### Step 4: **(optional)** Configure - Available properties

#### **`planId`**

**Required** - The plan id you want to checkout.

#### **`theme`**

**Optional** - The theme you want to use for the checkout.

Possible values are `light`, `dark` or `system`.

#### **`themeOptions`**

**Optional** - Fine-grained theme options for the checkout embed.

**`themeOptions.backgroundColor`** - A hex color to match the embed background to your site. The embed automatically picks light or dark text and tints its panels and inputs to fit the color, overriding `theme`.

```tsx theme={null}
<WhopCheckoutEmbed
	themeOptions={{ backgroundColor: "#09090b" }}
	planId="plan_XXXXXXXXX"
/>
```

**`themeOptions.accentColor`** - The accent color used for the submit button, focus rings, and links. Accepts any hex color — the embed derives the full accent palette from it, including a legible button text color. Named palette values like `green` or `blue` are also supported (the full list is under `data-whop-checkout-theme-accent-color`).

```tsx theme={null}
<WhopCheckoutEmbed
	themeOptions={{ accentColor: "#7c3aed" }}
	planId="plan_XXXXXXXXX"
/>
```

**`themeOptions.highContrast`** - Set to `true` to render the submit button with higher contrast against the checkout background.

```tsx theme={null}
<WhopCheckoutEmbed
	themeOptions={{ highContrast: true }}
	planId="plan_XXXXXXXXX"
/>
```

**`themeOptions.borderRadius`** - The corner radius for the embed, in pixels. Inputs use the value as-is; buttons and containers scale proportionally (1.5× and 2×). Pass `0` for square corners.

```tsx theme={null}
<WhopCheckoutEmbed
	themeOptions={{ borderRadius: 8 }}
	planId="plan_XXXXXXXXX"
/>
```

#### **`sessionId`**

**Optional** - The session id to use for the checkout.

This can be used to attach metadata to a checkout by first creating a session through the API and then passing the session id to the checkout element.

#### **`returnUrl`**

**Optional** - The URL to redirect the user to after checkout completes.

```tsx theme={null}
<WhopCheckoutEmbed
	returnUrl="https://yoursite.com/checkout/complete"
	planId="plan_XXXXXXXXX"
/>
```

#### **`affiliateCode`**

**Optional** - The affiliate code to use for the checkout.

```tsx theme={null}
<WhopCheckoutEmbed affiliateCode="tristan" planId="plan_XXXXXXXXX" />
```

#### **`hidePrice`**

**Optional** - Turn on to hide the price in the embedded checkout form.

Defaults to `false`

#### **`hideTermsAndConditions`**

**Optional** - Set to `true` to hide the terms and conditions in the embedded checkout form.

Defaults to `false`

#### **`skipRedirect`**

**Optional** - Set to `true` to skip the final redirect and keep the top frame loaded.

Defaults to `false`

#### **`adaptivePricing`**

**Optional** - Set to `true` to enable adaptive pricing on the embedded checkout. When enabled and supported for the plan, prices are presented in the buyer's local currency.

Defaults to `false` — embedded checkouts must opt in explicitly. Buyers will be charged in the plan's base currency unless this is set.

See [Listening for currency changes](#listening-for-currency-changes) to react to currency events from the embed or switch currencies programmatically.

```tsx theme={null}
<WhopCheckoutEmbed adaptivePricing planId="plan_XXXXXXXXX" />
```

#### **`collectPhoneNumbers`**

**Optional** - Set to `true` to require phone number collection during checkout, or `false` to disable it. When omitted, the default behavior from the plan's feature settings is used.

```tsx theme={null}
<WhopCheckoutEmbed collectPhoneNumbers planId="plan_XXXXXXXXX" />
```

#### **`collectShipping`**

**Optional** - Set to `true` to collect a shipping address during checkout, even when the plan does not require one. Works in both the regular embedded checkout and the [one click checkout button](/payments/one-click-checkout-button) (Apple Pay; Google Pay shipping support is pending). To hide the shipping address instead, use `shipping.address.hidden`.

```tsx theme={null}
<WhopCheckoutEmbed collectShipping planId="plan_XXXXXXXXX" />
```

#### **`locale`**

**Optional** - The language the checkout renders in, as a locale code (e.g. `"es"`, `"fr"`, `"pt"`). When omitted, the checkout falls back to the buyer's browser language preference.

```tsx theme={null}
<WhopCheckoutEmbed locale="es" planId="plan_XXXXXXXXX" />
```

#### **`onComplete`**

**Optional** - A callback function that will be called when the checkout is complete.

<Note>This option will set `skipRedirect` to `true`</Note>

```tsx theme={null}
<WhopCheckoutEmbed
	onComplete={(planId, receiptId) => {
		console.log(planId, receiptId);
	}}
	planId="plan_XXXXXXXXX"
/>
```

#### **`utm`**

**Optional** - The UTM parameters to add to the checkout URL.

**Note** - The keys must start with `utm_`

```tsx theme={null}
<WhopCheckoutEmbed
	planId="plan_XXXXXXXXX"
	utm={{ utm_campaign: "ad_XXXXXXX" }}
/>
```

#### **`fallback`**

**Optional** - The fallback content to show while the checkout is loading.

```tsx theme={null}
<WhopCheckoutEmbed fallback={<>loading...</>} planId="plan_XXXXXXXXX" />
```

#### **`prefill`**

**Optional** - The prefill options to apply to the checkout embed.

Used to prefill the email or address in the embedded checkout form.
This setting can be helpful when integrating the embed into a funnel that collects the email prior to payment already.

```tsx theme={null}
<WhopCheckoutEmbed
  prefill={{ email: "example@domain.com" }}
  planId="plan_XXXXXXXXX"
/>
<WhopCheckoutEmbed
  prefill={{ address: {
    name: "John Doe",
    country: "US",
    line1: "123 Main St",
    city: "Any Town",
    state: "CA",
    postalCode: "12345",
  } }}
  planId="plan_XXXXXXXXX"
/>
```

#### **`hideEmail`**

**Optional** - Set to `true` to hide the email input in the embedded checkout form. Make sure to display the users email in the parent page when setting this attribute.

Defaults to `false`

<Note>
  Use this in conjunction with the `prefill` attribute or the `setEmail` method
  to control the email input.
</Note>

```tsx theme={null}
<WhopCheckoutEmbed hideEmail planId="plan_XXXXXXXXX" />
```

#### **`disableEmail`**

**Optional** - Set to `true` to disable the email input in the embedded checkout form.

Defaults to `false`

<Note>
  Use this in conjunction with the `prefill` attribute or the `setEmail` method
  to control the email input.
</Note>

```tsx theme={null}
<WhopCheckoutEmbed disableEmail planId="plan_XXXXXXXXX" />
```

#### **`hideAddressForm`**

**Optional** - Set to `true` to hide the address form in the embedded checkout form.

Defaults to `false`

<Note>
  Use this in conjunction with the `setAddress` method to control the address
  input.
</Note>

```tsx theme={null}
<WhopCheckoutEmbed hideAddressForm planId="plan_XXXXXXXXX" />
```

#### **`setupFutureUsage`**

**Optional** - The setup future usage to use for the checkout. When using the `chargeUser` API you need to set this to `off_session`. This will filter out payment methods that are not supported with that API.

```tsx theme={null}
<WhopCheckoutEmbed setupFutureUsage="off_session" planId="plan_XXXXXXXXX" />
```

#### **`onStateChange`**

**Optional** - A callback function that will be called when the checkout state changes.

This can be used when programmatically submitting the checkout embed.

Possible values are `loading`, `ready`, `disabled`.

```tsx theme={null}
<WhopCheckoutEmbed
	onStateChange={(state) => {
		console.log(state);
	}}
	planId="plan_XXXXXXXXX"
/>
```

#### **`environment`**

**Optional** - The environment to use for the checkout.

Possible values are `production` or `sandbox`.

Defaults to `production`

<Note>
  When using `sandbox`, make sure to use a sandbox plan ID. Sandbox plans can be
  created in the [sandbox dashboard](https://sandbox.whop.com/dashboard).
</Note>

```tsx theme={null}
<WhopCheckoutEmbed environment="sandbox" planId="plan_XXXXXXXXX" />
```

#### **`onAddressValidationError`**

**Optional** - A callback function that will be called when the address validation error occurs.

<Note>
  This method will only work if the address form is hidden. You can hide the
  address form by setting the `hideAddressForm` prop to `true`.
</Note>

```tsx theme={null}
<WhopCheckoutEmbed
	hideAddressForm
	onAddressValidationError={(error) => {
		console.log(error);
	}}
	planId="plan_XXXXXXXXX"
/>
```

#### **`onPaymentError`**

**Optional** - A callback function that will be called when checkout payment processing fails.

The callback receives an error object with a human readable `message` and an optional machine readable `code`. It fires for declines on submit as well as failures detected while the payment is processing, for example after 3D Secure or a redirect to an external payment provider.

```tsx theme={null}
<WhopCheckoutEmbed
	onPaymentError={(error) => {
		console.log(error.message, error.code);
	}}
	planId="plan_XXXXXXXXX"
/>
```

#### **`onPromoCodeChanged`**

**Optional** - A callback function that will be called when the promo code changes.

The callback receives the full promo code object when a code is applied, or `null` when the code is removed.

```tsx theme={null}
<WhopCheckoutEmbed
	onPromoCodeChanged={(promoCode) => {
		if (promoCode) {
			console.log(
				"Promo applied:",
				promoCode.code,
				promoCode.type,
				promoCode.amount,
			);
		} else {
			console.log("Promo removed");
		}
	}}
	planId="plan_XXXXXXXXX"
/>
```

#### **`styles`**

**Optional** - Customize the padding of the checkout embed container.

The `styles` prop accepts a `container` object with the following properties:

| Property        | Description                          | Default |
| --------------- | ------------------------------------ | ------- |
| `paddingTop`    | Top padding in pixels                | `32`    |
| `paddingBottom` | Bottom padding in pixels             | `32`    |
| `paddingLeft`   | Left padding in pixels               | `32`    |
| `paddingRight`  | Right padding in pixels              | `32`    |
| `paddingY`      | Shorthand for top and bottom padding | `32`    |
| `paddingX`      | Shorthand for left and right padding | `32`    |

Individual properties take precedence over their shorthand equivalents.

```tsx theme={null}
<WhopCheckoutEmbed
	planId="plan_XXXXXXXXX"
	styles={{ container: { paddingX: 0 } }}
/>
```

```tsx theme={null}
<WhopCheckoutEmbed
	planId="plan_XXXXXXXXX"
	styles={{
		container: {
			paddingLeft: 16,
			paddingRight: 16,
			paddingTop: 0,
			paddingBottom: 0,
		},
	}}
/>
```

### Full example

```tsx theme={null}
import { WhopCheckoutEmbed } from "@whop/checkout/react";

export default function Home() {
	return (
		<WhopCheckoutEmbed
			fallback={<>loading...</>}
			planId="plan_XXXXXXXXX"
			sessionId="ch_XXXXXXXXX"
			returnUrl="https://yoursite.com/checkout/complete"
			theme="light"
			hidePrice={false}
		/>
	);
}
```

## Other websites

### Step 1: Add the script tag

To embed checkout, you need to add the following script tag into the `<head>` of your page:

```md theme={null}
<script
  async
  defer
  src="https://js.whop.com/static/checkout/loader.js"
></script>
```

### Step 2: Add the checkout element

To create a checkout element, you need to include the following attributes on an element in your page:

```md theme={null}
<div
  data-whop-checkout-plan-id="plan_XXXXXXXXX"
  data-whop-checkout-return-url="https://yoursite.com/checkout/complete"
></div>
```

This will mount an iframe inside of the element with the plan id you provided.

The `data-whop-checkout-return-url` is required to handle redirects from external payment providers. When redirected, check the `status` query parameter:

* **success**: The payment succeeded. Use the receipt information to render a success page.
* **error**: The payment failed or was canceled. Remount the checkout so your customer can try again.

### Step 3: **(optional)** Configure - Programmatic controls

First, attach an `id` to the checkout container:

```md theme={null}
<div id="whop-embedded-checkout" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`submit`**

To submit checkout programmatically, you can use the `submit` method on the checkout element.

```js theme={null}
wco.submit("whop-embedded-checkout");
```

#### **`getEmail`**

To get the email of the user who is checking out, you can use the `getEmail` method on the checkout element.

```js theme={null}
const email = await wco.getEmail("whop-embedded-checkout");
console.log(email);
```

#### **`setEmail`**

To set the email of the user who is checking out, you can use the `setEmail` method on the checkout element.

```js theme={null}
wco.setEmail("whop-embedded-checkout", "example@domain.com");
```

#### **`getAddress`**

To get the address of the user who is checking out, you can use the `getAddress` method on the checkout element.

```js theme={null}
const address = await wco.getAddress("whop-embedded-checkout");
console.log(address);
```

#### **`setAddress`**

To set the address of the user who is checking out, you can use the `setAddress` method on the checkout element.

<Note>
  This method will only work if the address form is hidden. You can hide the
  address form by setting the `data-whop-checkout-hide-address` prop to `true`.
</Note>

```js theme={null}
try {
	await wco.setAddress("whop-embedded-checkout", {
		name: "John Doe",
		country: "US",
		line1: "123 Main St",
		city: "Any Town",
		state: "CA",
		postalCode: "12345",
	});
} catch (error) {
	console.error(error);
}
```

### Step 4: **(optional)** Configure - Available attributes

#### **`data-whop-checkout-plan-id`**

**Required** - The plan id you want to checkout.

> To get your plan id, you need to first create a plan in the **Manage Pricing** section on your whop page.

#### **`data-whop-checkout-theme`**

**Optional** - The theme you want to use for the checkout.

Possible values are `light`, `dark` or `system`.

```md theme={null}
<div data-whop-checkout-theme="light" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-theme-accent-color`**

**Optional** - The accent color to apply to the checkout embed.

Accepts any hex color like `#7c3aed` — the embed derives the full accent palette from it, including a legible button text color. The following named palettes are also supported:

* `tomato`
* `red`
* `ruby`
* `crimson`
* `pink`
* `plum`
* `purple`
* `violet`
* `iris`
* `cyan`
* `teal`
* `jade`
* `green`
* `grass`
* `brown`
* `blue`
* `orange`
* `indigo`
* `sky`
* `mint`
* `yellow`
* `amber`
* `lime`
* `lemon`
* `magenta`
* `gold`
* `bronze`
* `gray`

```md theme={null}
<div data-whop-checkout-theme-accent-color="green" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-theme-background-color`**

**Optional** - The background color to apply to the checkout embed.

Accepts a hex color like `#09090b`. The embed automatically picks light or dark text and tints its panels and inputs to fit the color, overriding `data-whop-checkout-theme`.

```md theme={null}
<div data-whop-checkout-theme-background-color="#09090b" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-theme-border-radius`**

**Optional** - The corner radius to apply to the checkout embed, in pixels.

Inputs use the value as-is; buttons and containers scale proportionally (1.5× and 2×). Pass `0` for square corners.

```md theme={null}
<div data-whop-checkout-theme-border-radius="8" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-session`**

**Optional** - The session id to use for the checkout.

This can be used to attach metadata to a checkout by first creating a session through the API and then passing the session id to the checkout element.

```md theme={null}
<div data-whop-checkout-session="ch_XXXXXXXXX" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-return-url`**

**Optional** - The URL to redirect the user to after checkout completes.

```md theme={null}
<div data-whop-checkout-return-url="https://yoursite.com/checkout/complete" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-affiliate-code`**

**Optional** - The affiliate code to use for the checkout.

```md theme={null}
<div data-whop-checkout-affiliate-code="tristan" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-hide-price`**

**Optional** - Set to `true` to hide the price in the embedded checkout form.

Defaults to `false`

```md theme={null}
<div data-whop-checkout-hide-price="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-hide-submit-button`**

**Optional** - Set to `true` to hide the submit button in the embedded checkout form.

Defaults to `false`

<Note>
  When using this Option, you will need to [programmatically submit](#submit)
  the checkout form.
</Note>

```md theme={null}
<div data-whop-checkout-hide-submit-button="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-hide-tos`**

**Optional** - Set to `true` to hide the terms and conditions in the embedded checkout form.

Defaults to `false`

```md theme={null}
<div data-whop-checkout-hide-tos="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-skip-redirect`**

**Optional** - Set to `true` to skip the final redirect and keep the top frame loaded.

Defaults to `false`

```md theme={null}
<div data-whop-checkout-skip-redirect="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-adaptive-pricing`**

**Optional** - Set to `true` to enable adaptive pricing on the embedded checkout. When enabled and supported for the plan, prices are presented in the buyer's local currency.

Defaults to `false` — embedded checkouts must opt in explicitly. Buyers will be charged in the plan's base currency unless this is set.

See [Listening for currency changes](#listening-for-currency-changes) to react to currency events from the embed or switch currencies programmatically.

```md theme={null}
<div data-whop-checkout-adaptive-pricing="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-collect-phone-numbers`**

**Optional** - Set to `true` to require phone number collection during checkout, or `false` to disable it. When omitted, the default behavior from the plan's feature settings is used.

```md theme={null}
<div data-whop-checkout-collect-phone-numbers="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-collect-shipping`**

**Optional** - Set to `true` to collect a shipping address during checkout, even when the plan does not require one. To hide the shipping address instead, use `shipping.address.hidden`.

```md theme={null}
<div data-whop-checkout-collect-shipping="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-locale`**

**Optional** - The language the checkout renders in, as a locale code (e.g. `"es"`, `"fr"`, `"pt"`). When omitted, the checkout falls back to the buyer's browser language preference.

```md theme={null}
<div data-whop-checkout-locale="es" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-on-complete`**

**Optional** - The callback to call when the checkout succeeds

<Note>This option will set `data-whop-checkout-skip-redirect` to `true`</Note>

```html theme={null}
<script>
	window.onCheckoutComplete = (planId, receiptId) => {
		console.log(planId, receiptId);
	};
</script>

<div
	data-whop-checkout-on-complete="onCheckoutComplete"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

#### **`data-whop-checkout-on-state-change`**

**Optional** - The callback to call when state of the checkout changes

This can be used when programmatically submitting the checkout embed.

Possible values are `loading`, `ready`, `disabled`.

```html theme={null}
<script>
	window.onCheckoutStateChange = (state) => {
		console.log(state);
	};
</script>

<div
	data-whop-checkout-on-state-change="onCheckoutStateChange"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

#### **`data-whop-checkout-skip-utm`**

By default any utm params from the main page will be forwarded to the checkout embed.

**Optional** - Set to `true` to prevent the automatic forwarding of utm parameters

Defaults to `false`

#### **`data-whop-checkout-prefill-*`**

Used to prefill the email or address in the embedded checkout form. This setting can be helpful when integrating the embed into a funnel that collects the email prior to payment already.

```md theme={null}
<div data-whop-checkout-prefill-email="example@domain.com" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>

<div 
	data-whop-checkout-prefill-name="John Doe"
	data-whop-checkout-prefill-address-country="US"
	data-whop-checkout-prefill-address-line1="123 Main St"
	data-whop-checkout-prefill-address-line2=""
	data-whop-checkout-prefill-address-city="Any Town"
	data-whop-checkout-prefill-address-state="CA"
	data-whop-checkout-prefill-address-postal-code="12345"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>

<div data-whop-checkout-prefill-address-name="John Doe" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-hide-email`**

**Optional** - Set to `true` to hide the email input in the embedded checkout form. Make sure to display the users email in the parent page when setting this attribute.

Defaults to `false`

<Note>
  Use this in conjunction with the `data-whop-checkout-prefill-email` attribute
  or the `setEmail` method to control the email input.
</Note>

```md theme={null}
<div data-whop-checkout-hide-email="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-disable-email`**

**Optional** - Set to `true` to disable the email input in the embedded checkout form.

Defaults to `false`

<Note>
  Use this in conjunction with the `data-whop-checkout-prefill-email` attribute
  or the `setEmail` method to control the email input.
</Note>

```md theme={null}
<div data-whop-checkout-disable-email="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-hide-address`**

**Optional** - Set to `true` to hide the address form in the embedded checkout form.

Defaults to `false`

<Note>
  This method will only work if the address form is hidden. You can hide the
  address form by setting the `data-whop-checkout-hide-address` prop to `true`.
</Note>

```md theme={null}
<div data-whop-checkout-hide-address="true" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-setup-future-usage`**

**Optional** - The setup future usage to use for the checkout. When using the `chargeUser` API you need to set this to `off_session`. This will filter out payment methods that are not supported with that API.

```md theme={null}
<div data-whop-checkout-setup-future-usage="off_session" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-environment`**

**Optional** - The environment to use for the checkout.

Possible values are `production` or `sandbox`.

Defaults to `production`

<Note>
  When using `sandbox`, make sure to use a sandbox plan ID. Sandbox plans can be
  created in the [sandbox dashboard](https://sandbox.whop.com/dashboard).
</Note>

```md theme={null}
<div data-whop-checkout-environment="sandbox" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>
```

#### **`data-whop-checkout-on-address-validation-error`**

**Optional** - The callback to call when the address validation error occurs.

<Note>
  This method will only work if the address form is hidden. You can hide the
  address form by setting the `data-whop-checkout-hide-address` prop to `true`.
</Note>

```html theme={null}
<script>
	window.onAddressValidationError = (error) => {
		console.log(error);
	};
</script>

<div
	data-whop-checkout-on-address-validation-error="onAddressValidationError"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

#### **`data-whop-checkout-on-payment-error`**

**Optional** - The callback to call when checkout payment processing fails.

The callback receives an error object with a human readable `message` and an optional machine readable `code`. It fires for declines on submit as well as failures detected while the payment is processing, for example after 3D Secure or a redirect to an external payment provider.

```html theme={null}
<script>
	window.onPaymentError = (error) => {
		console.log(error.message, error.code);
	};
</script>

<div
	data-whop-checkout-on-payment-error="onPaymentError"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

#### **`data-whop-checkout-on-promo-code-changed`**

**Optional** - The callback to call when the promo code changes.

The callback receives the full promo code object when a code is applied, or `null` when the code is removed.

```html theme={null}
<script>
	window.onPromoCodeChanged = (promoCode) => {
		if (promoCode) {
			console.log(
				"Promo applied:",
				promoCode.code,
				promoCode.type,
				promoCode.amount,
			);
		} else {
			console.log("Promo removed");
		}
	};
</script>

<div
	data-whop-checkout-on-promo-code-changed="onPromoCodeChanged"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

#### **`data-whop-checkout-style-*`**

**Optional** - Customize the padding of the checkout embed container.

The attribute pattern is `data-whop-checkout-style-container-{property}` where `{property}` is a kebab-case padding property.

| Attribute                                           | Description                          | Default |
| --------------------------------------------------- | ------------------------------------ | ------- |
| `data-whop-checkout-style-container-padding-top`    | Top padding in pixels                | `32`    |
| `data-whop-checkout-style-container-padding-bottom` | Bottom padding in pixels             | `32`    |
| `data-whop-checkout-style-container-padding-left`   | Left padding in pixels               | `32`    |
| `data-whop-checkout-style-container-padding-right`  | Right padding in pixels              | `32`    |
| `data-whop-checkout-style-container-padding-y`      | Shorthand for top and bottom padding | `32`    |
| `data-whop-checkout-style-container-padding-x`      | Shorthand for left and right padding | `32`    |

Individual properties take precedence over their shorthand equivalents.

```md theme={null}
<div
  data-whop-checkout-plan-id="plan_XXXXXXXXX"
  data-whop-checkout-style-container-padding-x="0"
></div>
```

```md theme={null}
<div
  data-whop-checkout-plan-id="plan_XXXXXXXXX"
  data-whop-checkout-style-container-padding-left="16"
  data-whop-checkout-style-container-padding-right="16"
  data-whop-checkout-style-container-padding-top="0"
  data-whop-checkout-style-container-padding-bottom="0"
></div>
```

### Full example

```md theme={null}
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width">
		<script
			async
			defer
  			src="https://js.whop.com/static/checkout/loader.js"
		></script>
		<title>Whop embedded checkout example</title>
		<style>
			div {
				box-sizing: border-box;
			}
			body {
				margin: 0
			}
		</style>
	</head>
	<body>
		<div
			data-whop-checkout-plan-id="plan_XXXXXXXXX"
			data-whop-checkout-session="ch_XXXXXXXXX"
			data-whop-checkout-return-url="https://yoursite.com/checkout/complete"
			data-whop-checkout-theme="light"
			data-whop-checkout-hide-price="false"
			style="height: fit-content; overflow: hidden; max-width: 50%;"
		></div>
	</body>
</html>
```

## Listening for currency changes

When [`adaptivePricing`](#adaptivepricing) is enabled, the embedded checkout exposes the available and active currencies through callbacks, a programmatic getter, and a setter for switching currencies.

The currency snapshot has the following shape:

| Field               | Type             | Description                                                                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `base_currency`     | `string`         | The plan's base currency (ISO 4217).                                                                                           |
| `optional_currency` | `string \| null` | The buyer's local currency when different from `base_currency` and supported. `null` when only the base currency is available. |
| `current_currency`  | `string`         | The currency currently displayed.                                                                                              |
| `exchange_rate`     | `number \| null` | Rate from `base_currency` to `current_currency`. `null` when no conversion is active.                                          |

### React

Use the `onCurrenciesAvailable` and `onCurrencyChanged` props to react to currency events, or read the latest snapshot from the embed's ref via `getAvailableCurrencies()`. Send the buyer to a different supported currency with `setDisplayCurrency()`.

```tsx theme={null}
import { useRef } from "react";
import { WhopCheckoutEmbed, type WhopCheckoutEmbedControls } from "@whop/react/checkout";

function Checkout() {
	const ref = useRef<WhopCheckoutEmbedControls>(null);

	return (
		<>
			<WhopCheckoutEmbed
				ref={ref}
				adaptivePricing
				planId="plan_XXXXXXXXX"
				onCurrenciesAvailable={(snapshot) => console.log(snapshot)}
				onCurrencyChanged={({ currency, exchange_rate }) =>
					console.log(currency, exchange_rate)
				}
			/>
			<button
				onClick={async () => {
					const snapshot = ref.current?.getAvailableCurrencies();
					if (snapshot?.optional_currency) {
						await ref.current?.setDisplayCurrency(snapshot.optional_currency);
					}
				}}
			>
				Use local currency
			</button>
		</>
	);
}
```

### HTML / vanilla JS

Set callbacks via data attributes pointing to functions on `window`. Use `wco.getAvailableCurrencies(identifier)` to read the latest snapshot and `wco.setDisplayCurrency(identifier, currency)` to switch.

```html theme={null}
<script>
	window.onCurrenciesAvailable = (snapshot) => console.log(snapshot);
	window.onCurrencyChanged = ({ currency, exchange_rate }) =>
		console.log(currency, exchange_rate);
</script>

<div
	id="whop-embedded-checkout"
	data-whop-checkout-plan-id="plan_XXXXXXXXX"
	data-whop-checkout-adaptive-pricing="true"
	data-whop-checkout-on-currencies-available="onCurrenciesAvailable"
	data-whop-checkout-on-currency-changed="onCurrencyChanged"
></div>

<script>
	document.querySelector("#switch").addEventListener("click", async () => {
		const snapshot = wco.getAvailableCurrencies("whop-embedded-checkout");
		if (snapshot?.optional_currency) {
			await wco.setDisplayCurrency(
				"whop-embedded-checkout",
				snapshot.optional_currency,
			);
		}
	});
</script>
```

<Note>
  `setDisplayCurrency` only accepts currencies present in the most recent
  `onCurrenciesAvailable` snapshot — any other currency is rejected with
  `WhopCheckoutSetDisplayCurrencyError`.
</Note>

## Apple Pay

Apple Pay allows customers to pay using their Apple Wallet, providing a seamless checkout experience on Safari and iOS devices. To enable Apple Pay on your embedded checkout, you need to verify ownership of your domain.

<Card title="Set up Apple Pay" icon="apple" href="/payments/apple-pay">
  Learn how to verify your domain and enable Apple Pay for embedded checkout
</Card>

<Note>
  When using the `hideSubmitButton` option in React, `@whop/checkout@0.0.43` or
  later is required for Apple Pay to appear in the embed.
</Note>

## Platform-specific guides

<CardGroup cols={3}>
  <Card title="Framer" icon="browser" href="/third-party-integrations/embedded-checkouts/framer-checkout">
    Embed checkout on Framer with Apple Pay support
  </Card>

  <Card title="ClickFunnels" icon="browser" href="/third-party-integrations/embedded-checkouts/clickfunnels-checkout">
    Embed checkout on ClickFunnels pages
  </Card>

  <Card title="GoHighLevel" icon="browser" href="/third-party-integrations/embedded-checkouts/gohighlevel-checkout">
    Embed checkout on GoHighLevel funnels
  </Card>
</CardGroup>

## FAQs

<AccordionGroup>
  <Accordion title="Why is my checkout not loading?">
    Make sure you've correctly replaced `plan_XXXXXXXXX` or `PLAN_ID_HERE` in the code snippets with your actual Plan ID from the Whop dashboard. Also verify that the script tag is properly loaded in the `<head>` section if using HTML/JS.
  </Accordion>

  <Accordion title="Where do I find my Plan ID?">
    Go to your **Dashboard** > **Checkout links** > Click the **three dots (⋮)** on your pricing option > Hover over **Details** > Click the ID (starts with `plan_`) to copy it.
  </Accordion>

  <Accordion title="Can I embed multiple checkouts on the same page?">
    Yes, you can add multiple checkout embeds with different Plan IDs. Each embed operates independently.
  </Accordion>

  <Accordion title="How do I change the checkout theme?">
    For React: add `theme="dark"` or `theme="light"` as a property. For HTML: add `data-whop-checkout-theme="dark"` to your div element.
  </Accordion>

  <Accordion title="Can I hide the price in the embedded checkout?">
    Yes, add `hidePrice={true}` in React or `data-whop-checkout-hide-price="true"` in HTML to hide the price display.
  </Accordion>

  <Accordion title="What happens after a customer completes checkout?">
    By default, customers are redirected to your whop. You can customize this by setting a custom redirect URL or skipping the redirect entirely.
  </Accordion>

  <Accordion title="How do I prevent the redirect after checkout?">
    Use `skipRedirect={true}` in React or `data-whop-checkout-skip-redirect="true"` in HTML to keep users on the same page.
  </Accordion>

  <Accordion title="Is the embedded checkout mobile-responsive?">
    Yes, the checkout automatically adapts to different screen sizes and devices.
  </Accordion>

  <Accordion title="Can I customize the checkout's appearance with CSS?">
    You can style the wrapper using the `.whop-checkout-wrapper iframe` CSS class, but the checkout content itself cannot be modified for security reasons.
  </Accordion>

  <Accordion title="Can I pre-fill customer information?">
    Yes, use `prefill={{ email: "customer@example.com" }}` in React or `data-whop-checkout-prefill-email="customer@example.com"` in HTML.
  </Accordion>
</AccordionGroup>
